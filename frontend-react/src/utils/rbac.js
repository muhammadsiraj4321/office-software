export function role(user){ return user?.role || '' }
export function isAdmin(user){ return role(user)==='ADMIN' }
export function isGM(user){ return role(user)==='GM' }
export function isManager(user){ return role(user)==='MANAGER' }
export function isAccountant(user){ return role(user)==='ACCOUNTANT' }
export function isEmployee(user){ return role(user)==='EMPLOYEE' }

export function canSeeDocuments(user){ return !isEmployee(user) }
export function canCreateProject(user){ return isAdmin(user) || isGM(user) || isAccountant(user) }
export function canAddIncome(user){ return isAdmin(user) || isGM(user) || isManager(user) || isAccountant(user) }
export function canAddExpense(user){ return true /* backend enforces per role; employees allowed */ }

const ONE_HOUR = 60*60*1000
const DAY = 24*ONE_HOUR

export function canEdit(role, currentUserId, ownerId, createdTs){
  const age = Date.now() - (createdTs||0)
  switch(role){
    case 'ADMIN': return true
    case 'GM': return true
    case 'MANAGER':
    case 'ACCOUNTANT': return currentUserId===ownerId && age<=DAY
    case 'EMPLOYEE': return currentUserId===ownerId && age<=ONE_HOUR
    default: return false
  }
}

export function canDelete(role, currentUserId, ownerId, createdTs){
  const age = Date.now() - (createdTs||0)
  switch(role){
    case 'ADMIN': return true
    case 'GM': return currentUserId===ownerId
    case 'MANAGER':
    case 'ACCOUNTANT': return currentUserId===ownerId && age<=DAY
    case 'EMPLOYEE': return currentUserId===ownerId && age<=ONE_HOUR
    default: return false
  }
}
