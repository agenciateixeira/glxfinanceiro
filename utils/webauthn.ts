import { createClient } from '@/lib/supabase/client'

/**
 * Face ID / Touch ID Authentication using WebAuthn
 * Works on iOS Safari and other modern browsers
 */

export interface WebAuthnCredential {
  id: string
  publicKey: string
  userId: string
}

/**
 * Check if WebAuthn is supported in the current browser
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' &&
         'PublicKeyCredential' in window &&
         typeof window.PublicKeyCredential === 'function'
}

/**
 * Check if platform authenticator (Face ID/Touch ID) is available
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false

  try {
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch {
    return false
  }
}

/**
 * Register a new WebAuthn credential (Face ID/Touch ID)
 * Call this after successful email/password login
 */
export async function registerWebAuthnCredential(
  userId: string,
  email: string
): Promise<boolean> {
  try {
    const supabase = createClient()

    // Create credential creation options
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: "Gestão GLX",
        id: window.location.hostname,
      },
      user: {
        id: new TextEncoder().encode(userId),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },  // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Force platform authenticator (Face ID/Touch ID)
        userVerification: "required",
        requireResidentKey: false,
      },
      timeout: 60000,
      attestation: "none",
    }

    // Create credential
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    }) as PublicKeyCredential | null

    if (!credential) {
      throw new Error('Failed to create credential')
    }

    // Store credential ID in Supabase (you'll need to create this table)
    const { error } = await supabase
      .from('webauthn_credentials')
      .insert({
        user_id: userId,
        credential_id: credential.id,
        credential_public_key: arrayBufferToBase64(
          (credential.response as AuthenticatorAttestationResponse).getPublicKey()!
        ),
      })

    if (error) {
      console.error('Error storing credential:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('WebAuthn registration error:', error)
    return false
  }
}

/**
 * Authenticate using WebAuthn (Face ID/Touch ID)
 * Call this on login page if credential exists
 */
export async function authenticateWithWebAuthn(email: string): Promise<boolean> {
  try {
    const supabase = createClient()

    // Get stored credentials for this email
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (!user) return false

    const { data: credentials } = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', user.id)

    if (!credentials || credentials.length === 0) {
      return false
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32))

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      allowCredentials: credentials.map(cred => ({
        id: base64ToArrayBuffer(cred.credential_id),
        type: 'public-key' as PublicKeyCredentialType,
      })),
      userVerification: 'required',
      timeout: 60000,
    }

    // Request authentication
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    }) as PublicKeyCredential | null

    if (!assertion) {
      return false
    }

    // Verify assertion (in production, verify on server)
    // For now, we'll just sign in with Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: '', // You'll need to handle this differently in production
    })

    return !error
  } catch (error) {
    console.error('WebAuthn authentication error:', error)
    return false
  }
}

// Helper functions
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
