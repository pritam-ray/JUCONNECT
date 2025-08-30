#!/usr/bin/env node

/**
 * Development helper script to check project health
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

function checkProjectHealth() {
  console.log('🔍 JU CONNECT - Project Health Check\n')

  // Check if essential files exist
  const essentialFiles = [
    'package.json',
    'src/App.tsx',
    'src/main.tsx',
    'src/lib/supabase.ts',
    'vite.config.ts',
    'tailwind.config.js'
  ]

  console.log('📁 Checking essential files...')
  essentialFiles.forEach(file => {
    if (existsSync(file)) {
      console.log(`✅ ${file}`)
    } else {
      console.log(`❌ ${file} - MISSING`)
    }
  })

  // Check environment setup
  console.log('\n🌍 Environment Check...')
  if (existsSync('.env')) {
    console.log('✅ .env file exists')
  } else {
    console.log('⚠️  .env file not found (demo mode)')
  }

  // Check dependencies
  console.log('\n📦 Checking dependencies...')
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
    const deps = Object.keys(packageJson.dependencies || {})
    const devDeps = Object.keys(packageJson.devDependencies || {})
    
    console.log(`✅ ${deps.length} dependencies installed`)
    console.log(`✅ ${devDeps.length} dev dependencies installed`)
  } catch (error) {
    console.log('❌ Failed to read package.json')
  }

  // Try to build
  console.log('\n🔨 Testing build...')
  try {
    execSync('npm run build', { stdio: 'pipe' })
    console.log('✅ Build successful')
  } catch (error) {
    console.log('❌ Build failed')
    console.log(error.stdout?.toString() || error.message)
  }

  // Check TypeScript
  console.log('\n📝 TypeScript Check...')
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' })
    console.log('✅ TypeScript check passed')
  } catch (error) {
    console.log('❌ TypeScript errors found')
  }

  console.log('\n✨ Health check complete!')
}

// Always run the health check when this script is executed directly
checkProjectHealth()
