import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getStoredUser, getStoredToken, login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser, AuthUser } from '../services/api'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  updateUser: (updates: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = getStoredUser()
      const storedToken = getStoredToken()

      if (storedUser && storedToken) {
        // Verify token is still valid
        try {
          const validUser = await getCurrentUser()
          if (validUser) {
            setUser(storedUser)
          } else {
            // Token invalid, clear storage
            apiLogout()
          }
        } catch {
          // Network error, keep stored user for now
          setUser(storedUser)
        }
      }
      setIsLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const result = await apiLogin(email, password)
    setUser({
      user_id: result.user_id,
      email: result.email,
      project_id: result.project_id
    })
  }

  const register = async (email: string, password: string) => {
    const result = await apiRegister(email, password)
    setUser({
      user_id: result.user_id,
      email: result.email,
      project_id: result.project_id
    })
  }

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  const updateUser = (updates: Partial<AuthUser>) => {
    setUser(prev => {
      if (!prev) return null
      const newUser = { ...prev, ...updates }
      // Update localStorage
      localStorage.setItem('voicenote_user', JSON.stringify(newUser))
      return newUser
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}