# Windows System Commands

## Important Note
This project is being developed on **Windows**. Some common Unix commands work differently or require alternatives.

## File Operations

### Navigation
```powershell
cd <directory>           # Change directory
cd ..                    # Go up one directory
cd \                     # Go to root
dir                      # List directory contents (or use 'ls' in PowerShell)
pwd                      # Print working directory
```

### File Management
```powershell
type <file>              # Display file contents (like 'cat' on Unix)
copy <source> <dest>     # Copy file
move <source> <dest>     # Move file
del <file>               # Delete file
mkdir <directory>        # Create directory
rmdir <directory>        # Remove empty directory
rmdir /s <directory>     # Remove directory and contents
```

### Search
```powershell
# PowerShell (recommended)
Get-ChildItem -Recurse -Filter "*.ts"     # Find TypeScript files
Select-String "pattern" -Path *.ts        # Search in files (like grep)

# Command Prompt
dir /s /b *.ts           # Find files recursively
findstr "pattern" *.ts   # Search in files
```

## Git Commands (Same as Unix)
```bash
git status               # Check repository status
git add .                # Stage all changes
git commit -m "message"  # Commit with message
git push                 # Push to remote
git pull                 # Pull from remote
git branch               # List branches
git checkout <branch>    # Switch branch
git log                  # View commit history
```

## Node.js & Package Management

### pnpm (Primary package manager)
```bash
pnpm install             # Install dependencies
pnpm dev                 # Start development server
pnpm build               # Build for production
pnpm test                # Run tests
pnpm add <package>       # Add dependency
pnpm remove <package>    # Remove dependency
```

### Node Version
```bash
node --version           # Check Node.js version
npm --version            # Check npm version
pnpm --version           # Check pnpm version
```

## Docker Commands (Same as Unix)
```bash
docker ps                # List running containers
docker ps -a             # List all containers
docker images            # List images
docker exec -it <container> sh    # Enter container shell
docker logs <container>  # View container logs
docker-compose up        # Start services
docker-compose down      # Stop services
```

## Process Management

### PowerShell
```powershell
Get-Process              # List running processes
Stop-Process -Name <name>    # Kill process by name
Stop-Process -Id <id>    # Kill process by ID
netstat -ano             # List network connections and ports
```

### Finding Process on Port
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill process by PID
taskkill /PID <process_id> /F
```

## Environment Variables

### PowerShell (Session)
```powershell
$env:VARIABLE_NAME = "value"         # Set variable
echo $env:VARIABLE_NAME              # Display variable
```

### System-wide (Persistent)
```powershell
# Using GUI
# Search "Environment Variables" in Windows Start menu

# Using PowerShell (requires admin)
[System.Environment]::SetEnvironmentVariable('VARIABLE_NAME', 'value', [System.EnvironmentVariableTarget]::User)
```

## File Permissions
Windows uses different permission model than Unix:
```powershell
# View permissions
icacls <file>

# Grant permissions
icacls <file> /grant <user>:F

# Remove permissions
icacls <file> /remove <user>
```

## Path Differences

### Path Separators
- **Windows**: Backslash `\` (e.g., `C:\Users\Name\Desktop`)
- **Unix**: Forward slash `/` (e.g., `/home/user/desktop`)
- **Node.js**: Accepts both on Windows, but prefer `/` for cross-platform

### Home Directory
- **Windows**: `%USERPROFILE%` (e.g., `C:\Users\YourName`)
- **Unix**: `~` or `$HOME` (e.g., `/home/username`)

## Recommended Tools

### PowerShell
- Modern shell with Unix-like commands
- Supports aliases: `ls`, `cat`, `grep` (via Select-String)
- Better for development than Command Prompt

### Windows Terminal
- Modern terminal with tabs and themes
- Recommended over legacy Command Prompt

### WSL (Windows Subsystem for Linux)
- Optional: Run Linux environment on Windows
- Provides native Unix commands
- Useful for better Docker performance

## Common Gotchas

### Line Endings
- **Windows**: CRLF (`\r\n`)
- **Unix**: LF (`\n`)
- Git and editors should handle this automatically
- Prettier configured to use LF: `endOfLine: "lf"`

### Case Sensitivity
- Windows filesystem is case-insensitive
- Unix filesystem is case-sensitive
- Be consistent with file naming

### Script Execution
```powershell
# PowerShell scripts (.ps1)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser  # Enable scripts

# Bash scripts (.sh) require WSL or Git Bash
sh ./script.sh           # If Git Bash installed
bash ./script.sh         # If WSL installed
```

## File Watching
Sometimes file watching doesn't work well on Windows:
```bash
# If hot reload not working in Next.js
# Add to next.config.js:
# experimental: { 
#   webpackBuildWorker: true
# }

# Or use polling (slower)
# pnpm dev -- --force-polling
```
