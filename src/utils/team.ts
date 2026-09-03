import { Team } from '../types'
import { userById } from '../data/users'

/** Nome de exibição do líder — usa o usuário mockado vinculado, ou o nome informado no cadastro. */
export function leaderName(team: Team): string {
  if (team.leaderId) {
    const u = userById(team.leaderId)
    if (u) return u.name
  }
  return team.leaderName || '—'
}

/** E-mail de exibição do líder — usa o usuário mockado vinculado, ou o e-mail informado no cadastro. */
export function leaderEmail(team: Team): string {
  if (team.leaderId) {
    const u = userById(team.leaderId)
    if (u) return u.email
  }
  return team.leaderEmail || team.email
}

export function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}
