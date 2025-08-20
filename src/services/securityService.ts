import { supabase } from '../lib/supabase'

// File security validation service
interface SecurityScanResult {
  isClean: boolean
  threats: string[]
  scanId: string
  details?: any
}

// Dangerous file extensions that should be blocked
const DANGEROUS_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'com', 'pif', 'scr', 'vbs', 'js', 'jar',
  'app', 'deb', 'pkg', 'rpm', 'dmg', 'iso', 'msi', 'run',
  'ps1', 'sh', 'bash', 'zsh', 'fish', 'csh', 'tcsh'
]

// Suspicious patterns in file names
const SUSPICIOUS_PATTERNS = [
  /script/i,
  /payload/i,
  /exploit/i,
  /backdoor/i,
  /trojan/i,
  /virus/i,
  /malware/i,
  /keylog/i,
  /rootkit/i
]

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  /('|(\\')|(;)|(\\;)|(\\x27)|(\\x3D))/i,
  /(\\x3C)|(\\x3E)|(\\x22)|(\\x27)/i,
  /(select|insert|update|delete|drop|create|alter|exec|execute)/i,
  /(union|having|order\s+by|group\s+by)/i,
  /(script|javascript|vbscript|onload|onerror)/i
]

export const validateFileName = (fileName: string): { isValid: boolean; error?: string } => {
  // Check for empty or null filename
  if (!fileName || fileName.trim().length === 0) {
    return { isValid: false, error: 'File name cannot be empty' }
  }

  // Check filename length
  if (fileName.length > 255) {
    return { isValid: false, error: 'File name is too long (max 255 characters)' }
  }

  // Check for dangerous extensions
  const extension = fileName.split('.').pop()?.toLowerCase()
  if (extension && DANGEROUS_EXTENSIONS.includes(extension)) {
    return { isValid: false, error: `File type .${extension} is not allowed for security reasons` }
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(fileName)) {
      return { isValid: false, error: 'File name contains suspicious content' }
    }
  }

  // Check for SQL injection attempts
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(fileName)) {
      return { isValid: false, error: 'File name contains invalid characters' }
    }
  }

  // Check for path traversal attempts
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { isValid: false, error: 'File name contains invalid path characters' }
  }

  // Check for null bytes and control characters (excluding some safe ones like tab)
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/.test(fileName)) {
    return { isValid: false, error: 'File name contains invalid control characters' }
  }

  return { isValid: true }
}

export const validateFileContent = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
  try {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { isValid: false, error: 'File size exceeds 5MB limit' }
    }

    // Check MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedMimeTypes.includes(file.type)) {
      return { isValid: false, error: 'File type not allowed' }
    }

    // Read file header to verify actual file type matches extension
    const buffer = await file.slice(0, 512).arrayBuffer()
    const bytes = new Uint8Array(buffer)
    
    // Check for executable file signatures
    const executableSignatures = [
      [0x4D, 0x5A], // PE executable (Windows .exe)
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable (Linux)
      [0xCF, 0xFA, 0xED, 0xFE], // Mach-O executable (macOS)
      [0xFE, 0xED, 0xFA, 0xCE], // Mach-O executable (macOS, different endian)
    ]

    for (const signature of executableSignatures) {
      if (bytes.length >= signature.length) {
        let matches = true
        for (let i = 0; i < signature.length; i++) {
          if (bytes[i] !== signature[i]) {
            matches = false
            break
          }
        }
        if (matches) {
          return { isValid: false, error: 'Executable files are not allowed' }
        }
      }
    }

    // Check for script content in text files
    if (file.type === 'text/plain') {
      const text = await file.text()
      const scriptPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /on\w+\s*=/i, // Event handlers like onclick=
        /eval\s*\(/i,
        /document\.write/i,
        /innerHTML/i
      ]

      for (const pattern of scriptPatterns) {
        if (pattern.test(text)) {
          return { isValid: false, error: 'File contains potentially malicious script content' }
        }
      }
    }

    return { isValid: true }
  } catch (error) {
    console.error('File validation error:', error)
    return { isValid: false, error: 'Failed to validate file content' }
  }
}

// Mock virus scanning function (in production, integrate with actual antivirus API)
export const performVirusScan = async (file: File): Promise<SecurityScanResult> => {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // In production, integrate with services like:
    // - VirusTotal API
    // - ClamAV
    // - Windows Defender API
    // - Sophos API
    
    // Mock scan result - in production this would be real scan results
    const mockResult: SecurityScanResult = {
      isClean: true,
      threats: [],
      scanId: `scan_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      details: {
        scanEngine: 'MockAV',
        scanTime: new Date().toISOString(),
        fileHash: await generateFileHash(file)
      }
    }

    // Simulate threat detection for demo purposes (files with "virus" in name)
    if (file.name.toLowerCase().includes('virus') || file.name.toLowerCase().includes('malware')) {
      mockResult.isClean = false
      mockResult.threats = ['Trojan.Generic.Mock', 'Suspicious.File.Pattern']
    }

    return mockResult
  } catch (error) {
    console.error('Virus scan error:', error)
    return {
      isClean: false,
      threats: ['Scan.Error'],
      scanId: `error_${Date.now()}`,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

// Generate file hash for integrity checking
const generateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Store security scan results
export const storeSecurityScanResult = async (
  contentId: string,
  scanResult: SecurityScanResult
): Promise<void> => {
  if (!supabase) {
    throw new Error('Supabase client not available')
  }

  const { error } = await supabase
    .from('file_security_scans')
    .insert([{
      content_id: contentId,
      scan_status: scanResult.isClean ? 'clean' : 'infected',
      scan_results: {
        threats: scanResult.threats,
        scanId: scanResult.scanId,
        details: scanResult.details
      },
      scanned_at: new Date().toISOString()
    }])

  if (error) {
    console.error('Failed to store security scan result:', error)
    throw error
  }
}

// Sanitize text input to prevent XSS and injection attacks
const sanitizeTextInput = (input: string): string => {
  if (!input) return ''
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

// Validate and sanitize metadata
export const validateMetadata = (metadata: any): { isValid: boolean; sanitized?: any; error?: string } => {
  try {
    const sanitized = {
      title: sanitizeTextInput(metadata.title || ''),
      description: sanitizeTextInput(metadata.description || ''),
      tags: Array.isArray(metadata.tags) 
        ? metadata.tags.map((tag: string) => sanitizeTextInput(tag)).filter(Boolean)
        : [],
      year: metadata.year && !isNaN(parseInt(metadata.year)) ? parseInt(metadata.year) : null,
      semester: metadata.semester && !isNaN(parseInt(metadata.semester)) ? parseInt(metadata.semester) : null
    }

    // Validate required fields
    if (!sanitized.title || sanitized.title.length === 0) {
      return { isValid: false, error: 'Title is required' }
    }

    if (sanitized.title.length > 255) {
      return { isValid: false, error: 'Title is too long (max 255 characters)' }
    }

    if (sanitized.description && sanitized.description.length > 1000) {
      return { isValid: false, error: 'Description is too long (max 1000 characters)' }
    }

    // Validate year range
    if (sanitized.year && (sanitized.year < 2000 || sanitized.year > 2030)) {
      return { isValid: false, error: 'Year must be between 2000 and 2025' }
    }

    // Validate semester range
    if (sanitized.semester && (sanitized.semester < 1 || sanitized.semester > 8)) {
      return { isValid: false, error: 'Semester must be between 1 and 10' }
    }

    return { isValid: true, sanitized }
  } catch (error) {
    return { isValid: false, error: 'Invalid metadata format' }
  }
}