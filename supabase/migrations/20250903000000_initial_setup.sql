-- Initial setup for JU CONNECTS - JECRC University Resource Hub
-- This migration creates the complete database structure from scratch

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'admin', 'super_admin');
CREATE TYPE content_type AS ENUM ('notes', 'previous_papers', 'assignments', 'study_materials', 'other');
CREATE TYPE file_type AS ENUM ('pdf', 'image', 'document', 'video', 'audio', 'other');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- User profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'student',
    is_verified BOOLEAN DEFAULT false,
    bio TEXT,
    year INTEGER CHECK (year BETWEEN 1 AND 4),
    section VARCHAR(10),
    course VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table for organizing content
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7) DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content/Posts table
CREATE TABLE content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content_type content_type NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    tags TEXT[],
    file_url TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    file_type file_type,
    download_count INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MESSAGING & CHAT SYSTEM
-- ============================================================================

-- Global chat messages (public chat)
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    is_edited BOOLEAN DEFAULT false,
    is_reported BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Private messages between users
CREATE TABLE private_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- GROUP SYSTEM
-- ============================================================================

-- Class groups (year-section-subject based)
CREATE TABLE class_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    year INTEGER NOT NULL CHECK (year BETWEEN 1 AND 4),
    section VARCHAR(10) NOT NULL,
    subject VARCHAR(100),
    password_hash TEXT,
    is_public BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 100,
    member_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(year, section, subject)
);

-- Group membership
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Group messages
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    file_url TEXT,
    file_name VARCHAR(255),
    reply_to UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    is_announcement BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Group message read status
CREATE TABLE group_message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Group file sharing
CREATE TABLE group_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type file_type,
    description TEXT,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADMINISTRATIVE & MODERATION
-- ============================================================================

-- Update requests for content modifications
CREATE TABLE update_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content_id UUID REFERENCES content(id) ON DELETE CASCADE,
    title VARCHAR(200),
    description TEXT,
    requested_changes TEXT NOT NULL,
    status request_status DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content reports
CREATE TABLE content_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat reports
CREATE TABLE chat_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User blocking system
CREATE TABLE user_blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- ============================================================================
-- UTILITY TABLES
-- ============================================================================

-- Educational links/resources
CREATE TABLE educational_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    added_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    is_verified BOOLEAN DEFAULT false,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File uploads tracking
CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type file_type,
    upload_purpose VARCHAR(50), -- 'content', 'chat', 'group', 'profile'
    related_id UUID, -- ID of related content/chat/group
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File security scans
CREATE TABLE file_security_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_upload_id UUID NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
    scan_status VARCHAR(20) DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'suspicious', 'malicious')),
    scan_details JSONB,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Profile indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_year_section ON profiles(year, section);

-- Content indexes
CREATE INDEX idx_content_category ON content(category_id);
CREATE INDEX idx_content_type ON content(content_type);
CREATE INDEX idx_content_approved ON content(is_approved);
CREATE INDEX idx_content_tags ON content USING GIN(tags);
CREATE INDEX idx_content_search ON content USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Chat indexes
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX idx_private_messages_recipient ON private_messages(recipient_id);
CREATE INDEX idx_private_messages_created ON private_messages(created_at DESC);

-- Group indexes
CREATE INDEX idx_class_groups_year_section ON class_groups(year, section);
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_created ON group_messages(created_at DESC);
CREATE INDEX idx_group_message_reads_message ON group_message_reads(message_id);
CREATE INDEX idx_group_files_group_id ON group_files(group_id);

-- Report indexes
CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_chat_reports_status ON chat_reports(status);

-- Block indexes
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Educational links indexes
CREATE INDEX idx_educational_links_category ON educational_links(category_id);

-- Update requests indexes
CREATE INDEX idx_update_requests_status ON update_requests(status);

-- File security indexes
CREATE INDEX idx_file_security_scans_status ON file_security_scans(scan_status);
