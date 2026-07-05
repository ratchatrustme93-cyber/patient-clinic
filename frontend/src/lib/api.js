import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.clear()
      location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
