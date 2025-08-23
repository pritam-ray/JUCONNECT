#!/bin/bash

# JU_CONNECT Code Cleanup Scripts
# This file contains commands to help clean up remaining warnings

echo "🔧 JU_CONNECT Code Cleanup Helper"
echo "================================="

# Function to remove console.log statements (use with caution)
cleanup_console_logs() {
    echo "⚠️  This will remove console.log statements. Make sure you have backups!"
    echo "🔍 Searching for console.log statements..."
    
    # Find all console.log statements
    grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" | wc -l
    
    echo "📝 To remove console.log statements manually, check these files:"
    grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" -l | sort
}

# Function to find unused variables
find_unused_variables() {
    echo "🔍 Finding files with unused variables..."
    npm run lint 2>&1 | grep "is assigned a value but never used\|is defined but never used" | head -20
}

# Function to find any types that could be improved
find_any_types() {
    echo "🔍 Finding TypeScript 'any' types..."
    grep -r ": any\|<any>" src/ --include="*.ts" --include="*.tsx" | wc -l
    echo "📝 Files with 'any' types:"
    grep -r ": any\|<any>" src/ --include="*.ts" --include="*.tsx" -l | sort | head -10
}

# Function to check hook dependencies
check_hook_dependencies() {
    echo "🔍 Finding React Hook dependency warnings..."
    npm run lint 2>&1 | grep "React Hook.*dependency" | head -10
}

# Main menu
case "$1" in
    "console")
        cleanup_console_logs
        ;;
    "unused")
        find_unused_variables
        ;;
    "types")
        find_any_types
        ;;
    "hooks")
        check_hook_dependencies
        ;;
    "all")
        echo "🔍 Running all checks..."
        cleanup_console_logs
        echo ""
        find_unused_variables
        echo ""
        find_any_types
        echo ""
        check_hook_dependencies
        ;;
    *)
        echo "Usage: $0 {console|unused|types|hooks|all}"
        echo ""
        echo "Commands:"
        echo "  console  - Find console.log statements"
        echo "  unused   - Find unused variables"
        echo "  types    - Find TypeScript 'any' types"
        echo "  hooks    - Find React Hook dependency issues"
        echo "  all      - Run all checks"
        echo ""
        echo "Example: ./cleanup.sh console"
        ;;
esac
