export const getToken = () => localStorage.getItem('token')
export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null')
export const isLoggedIn = () => !!getToken()

export function saveAuth({ token, user }) {
  localStorage.setItem('token', token)
  localStorage.setItem('user', JSON.stringify(user))
}

export function logout() {
  localStorage.clear()
  location.href = '/login'
}

// MASTER/ADMIN สามารถจัดการข้อมูลได้
export const canManage = (user = getUser()) => ['MASTER', 'ADMIN'].includes(user?.role)
