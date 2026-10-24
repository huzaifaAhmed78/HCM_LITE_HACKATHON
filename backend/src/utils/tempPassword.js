import { randomBytes, randomInt } from 'node:crypto'

// Example: "a3f9c01bA42". Has lowercase, uppercase and digits. Shown once, then must be changed.
export function generateTempPassword() {
  return `${randomBytes(4).toString('hex')}A${randomInt(10, 100)}`
}
