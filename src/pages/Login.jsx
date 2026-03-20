import { Form, Input, Button, Card, message, Space } from 'antd'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react' // ✅ FIX
import logo from '../assets/logo.svg'

const Login = () => {
  const navigate = useNavigate()

 

  const onFinish = async (values) => {
    try {
      const res = await axios.post('http://localhost:3000/auth/login', values)

      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      message.success('Login successful!')
      navigate('/dashboard')
    } catch (err) {
      message.error(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div style={styles.container}>
        <Space direction="vertical" size="large" align="center">
        <img src={logo} alt="PSF Logo"></img>

      <Card title="School ERP Login" style={styles.card}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email"
            name="email"
            rules={[{ required: true, message: 'Enter email' }]}
          >
            <Input placeholder="admin@school.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Enter password' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block>
            Login
          </Button>
        </Form>
      </Card>
      </Space>
    </div>
  )
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#f0f2f5',
  },
  card: {
    width: 350,
  },
}

export default Login