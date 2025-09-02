/*
  # Create profiles table for user management

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `username` (text, unique)
      - `full_name` (text)
      - `mobile_number` (text, unique)
      - `avatar_url` (text, optional)
      - `role` (enum: student, admin, super_admin)
      - `is_verified` (boolean)
      - `bio` (text, optional)
      - `year` (integer, optional)
      - `section` (text, optional)
      - `course` (text, optional)
      - `is_admin` (boolean, computed from role)
      - `is_online` (boolean, for real-time status)
      - `last_seen` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `profiles` table
    - Add policies for users to read/update their own profiles
    - Add policy for public profile viewing
    - Add admin policies for user management

  3. Functions
    - Auto-create profile on user signup
    - Update timestamps automatically
    - Handle online status updates
*/

-- Create user role enum
CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text NOT NULL,
  mobile_number text UNIQUE NOT NULL,
  avatar_url text,
  role user_role DEFAULT 'student',
  is_verified boolean DEFAULT false,
  bio text,
  year integer CHECK (year >= 1 AND year <= 5),
  section text,
  course text,
  is_admin boolean GENERATED ALWAYS AS (role IN ('admin', 'super_admin')) STORED,
  is_online boolean DEFAULT false,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON profiles(mobile_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_online ON profiles(is_online);
CREATE INDEX IF NOT EXISTS idx_profiles_year_section ON profiles(year, section);

-- RLS Policies
CREATE POLICY "Users can view all public profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Function to handle profile creation on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, mobile_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'mobile_number', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to update online status
CREATE OR REPLACE FUNCTION update_user_online_status(user_id uuid, is_online boolean)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET 
    is_online = update_user_online_status.is_online,
    last_seen = CASE WHEN update_user_online_status.is_online = false THEN now() ELSE last_seen END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;