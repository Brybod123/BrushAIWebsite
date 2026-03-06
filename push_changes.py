#!/usr/bin/env python3
import subprocess
import os
import sys
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return output"""
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
        return result.returncode == 0, result.stdout.strip(), result.stderr.strip()
    except Exception as e:
        return False, "", str(e)

def check_changes():
    """Check what files have changes"""
    success, output, _ = run_command("git status --porcelain")
    if not success:
        return []
    
    changes = []
    for line in output.split('\n'):
        if line.strip():
            status = line[:2]
            file_path = line[2:].strip()  # Changed from line[3:] to line[2:]
            changes.append((status, file_path))
    
    return changes

def get_file_changes(file_path):
    """Get git diff for a specific file"""
    success, output, _ = run_command(f"git diff {file_path}")
    if success:
        return output
    return ""

def main():
    print("🚀 BrushAI Git Push Helper")
    print("=" * 40)
    
    # Check if we're in a git repo
    if not Path(".git").exists():
        print("❌ Not in a git repository!")
        sys.exit(1)
    
    # Check for changes
    changes = check_changes()
    
    if not changes:
        print("✅ No changes to commit!")
        sys.exit(0)
    
    print(f"📝 Found {len(changes)} changed file(s):")
    for status, file_path in changes:
        status_icon = "📝" if status[0] == "M" else "➕" if status[0] == "A" else "❌"
        print(f"   {status_icon} {file_path}")
    
    print()
    
    # Show changes for key files
    key_files = ["netlify/functions/chat.js", "index.html"]
    for file_path in key_files:
        for status, changed_file in changes:
            if changed_file == file_path:
                print(f"🔍 Changes in {file_path}:")
                print("-" * 30)
                diff = get_file_changes(file_path)
                if diff:
                    print(diff[:500] + ("..." if len(diff) > 500 else ""))
                print("-" * 30)
                print()
    
    # Ask what to do
    print("What would you like to commit?")
    print("1. All changes")
    print("2. chat.js only")
    print("3. index.html only")
    print("4. Custom selection")
    print("5. Cancel")
    
    while True:
        choice = input("\nEnter choice (1-5, default=1): ").strip() or "1"
        
        if choice == "5":
            print("❌ Cancelled")
            sys.exit(0)
        
        if choice == "1":
            files_to_add = [file_path for _, file_path in changes]
            break
        elif choice == "2":
            files_to_add = ["netlify/functions/chat.js"]
            break
        elif choice == "3":
            files_to_add = ["index.html"]
            break
        elif choice == "4":
            file_input = input("Enter files to add (comma separated): ").strip()
            files_to_add = [f.strip() for f in file_input.split(",") if f.strip()]
            break
        else:
            print("Invalid choice, try again")
    
    # Filter to only files that actually have changes
    files_to_add = [f for f in files_to_add if any(changed_file == f for _, changed_file in changes)]
    
    if not files_to_add:
        print("❌ No matching files with changes!")
        sys.exit(0)
    
    print(f"\n📦 Adding: {', '.join(files_to_add)}")
    
    # Add files
    for file_path in files_to_add:
        success, _, error = run_command(f"git add {file_path}")
        if not success:
            print(f"❌ Failed to add {file_path}: {error}")
            sys.exit(1)
    
    # Get commit message
    default_msg = "Update BrushAI files"
    commit_msg = input(f"\n💬 Commit message (default: '{default_msg}'): ").strip() or default_msg
    
    # Commit
    print(f"🔒 Committing with message: '{commit_msg}'")
    success, _, error = run_command(f'git commit -m "{commit_msg}"')
    if not success:
        print(f"❌ Failed to commit: {error}")
        sys.exit(1)
    
    # Push
    print("📤 Pushing to GitHub...")
    success, _, error = run_command("git push origin main")
    if not success:
        print(f"❌ Failed to push: {error}")
        sys.exit(1)
    
    print("✅ Successfully pushed to GitHub!")

if __name__ == "__main__":
    main()
