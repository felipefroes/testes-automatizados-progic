import { readFileSync } from 'fs';
import path from 'path';

export type UsersData = {
  validUser: { email: string; password: string };
};

let cachedUsers: UsersData | null = null;

export function getUsers(): UsersData {
  if (!cachedUsers) {
    const usersPath = path.resolve(__dirname, '..', 'data', 'data', 'users.json');
    cachedUsers = JSON.parse(readFileSync(usersPath, 'utf-8')) as UsersData;
  }
  return cachedUsers;
}
