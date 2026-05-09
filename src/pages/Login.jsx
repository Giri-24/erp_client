import { useEffect } from 'react'
import { Form, Input, Button, message, Typography } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/logo.jpeg'
import instance from '../utils/axios'
import { usePermissions } from '../context/PermissionsContext'

const { Title, Text } = Typography

const Login = () => {
  const navigate = useNavigate()
  const { refresh } = usePermissions()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  const onFinish = async (values) => {
    try {
      const res = await instance.post('/auth/login', values)
      const user = res.data.user
      localStorage.setItem('token', res.data.access_token)

      // Staff-linked users should carry staff context into the dashboard session.
      if (user.role === 'STAFF' || user.role === 'TEACHER' || user.role === 'PRINCIPAL' || user.role === 'TRANSPORT_MANAGER') {
        try {
          // Staff list works if user has staff:read permission
          const staffRes = await instance.get('/staff')
          const staffList = Array.isArray(staffRes.data) ? staffRes.data : staffRes.data?.data || []
          const myStaff = staffList.find(s => s.email === user.email)
          if (myStaff) {
            user.staffId = myStaff.id
            user.designation = myStaff.designation
          }
        } catch {
          // Fallback: check own leave applications (auto-filtered to current user)
          try {
            const leaveRes = await instance.get('/hr/leave/applications', { params: { limit: 1 } })
            const leaves = Array.isArray(leaveRes.data) ? leaveRes.data : leaveRes.data?.data || []
            if (leaves[0]?.staffId) user.staffId = leaves[0].staffId
          } catch {}
          // Also try permissions
          if (!user.staffId) {
            try {
              const permRes = await instance.get('/hr/permission', { params: { limit: 1 } })
              const perms = Array.isArray(permRes.data) ? permRes.data : permRes.data?.data || []
              if (perms[0]?.staffId) user.staffId = perms[0].staffId
            } catch {}
          }
        }
      }

      localStorage.setItem('user', JSON.stringify(user))
      await refresh()
      message.success('Login successful!')
      navigate('/dashboard')
    } catch (err) {
      message.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div style={styles.wrapper}>
      {/* Left branding panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandContent}>
          <div style={styles.logoWrapper}>
            <img src={logo} alt="School Logo" style={styles.logo} />
          </div>
          <h1 style={styles.brandTitle}>School ERP</h1>
          <p style={styles.brandSubtitle}>ADMIN DASHBOARD</p>
          <p style={styles.brandDesc}>
            A sophisticated workspace for academic success. Manage admissions, 
            fees, transport, and staff with clarity and precision.
          </p>
        </div>
        <div style={styles.leftGradient} />
      </div>

      {/* Right login form */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={{ marginBottom: 40 }}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSubtitle}>Sign in to continue to your dashboard</p>
          </div>

          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              rules={[{ required: true, message: 'Please enter your email' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#43474d' }} />}
                placeholder="Email address"
                style={styles.input}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#43474d' }} />}
                placeholder="Password"
                style={styles.input}
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              className="gradient-btn"
              style={{ height: 48, fontSize: 14, marginTop: 8 }}
            >
              Sign In
            </Button>
          </Form>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <p style={{ color: '#43474d', fontSize: 12, fontFamily: "'Public Sans', sans-serif" }}>
              &copy; {new Date().getFullYear()} School ERP. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Public Sans', sans-serif",
  },
  leftPanel: {
    flex: '0 0 45%',
    background: 'linear-gradient(135deg, #00152a 0%, #102a43 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  leftGradient: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 30% 70%, rgba(68, 221, 193, 0.15) 0%, transparent 60%)',
    pointerEvents: 'none',
  },
  brandContent: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    padding: 48,
    maxWidth: 360,
  },
  logoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
    backdropFilter: 'blur(10px)',
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 14,
    objectFit: 'cover',
  },
  brandTitle: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: '#fff',
    margin: '0 0 4px',
    letterSpacing: '-0.02em',
  },
  brandSubtitle: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: 700,
    margin: '0 0 24px',
  },
  brandDesc: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 1.6,
    margin: 0,
  },
  rightPanel: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f6fafe',
    padding: '48px 24px',
  },
  formContainer: {
    width: '100%',
    maxWidth: 380,
  },
  formTitle: {
    fontFamily: "'Manrope', sans-serif",
    fontSize: 28,
    fontWeight: 800,
    color: '#00152a',
    margin: '0 0 4px',
    letterSpacing: '-0.02em',
  },
  formSubtitle: {
    color: '#43474d',
    fontSize: 14,
    margin: 0,
  },
  input: {
    borderRadius: 12,
    padding: '10px 14px',
    background: '#e4e9ed',
    border: 'none',
    fontFamily: "'Public Sans', sans-serif",
  },
}

export default Login