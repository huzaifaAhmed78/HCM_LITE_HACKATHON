# API Contract (v1)

Base URL: `{API_URL}/api/v1`. Frontend uses this to build screens and mock data **before** the backend is ready.
Status: **M1 Auth, First-run setup and M2 Org setup are final.** Other modules follow the endpoint list in `DOCS.md` section 6, and each gets its examples here when it is built.

## Conventions

- Send `Authorization: Bearer <token>` on every request except login and setup.
- JSON only. Dates are `YYYY-MM-DD`, timestamps are ISO strings (UTC).
- **Success:** `{ "success": true, "data": <any>, "message": "OK" }`
- **Error:** `{ "success": false, "message": "...", "errors": [{ "field": "email", "message": "..." }] }`

| Code | Meaning |
|---|---|
| 200 / 201 | OK / created |
| 400 | Bad request (for example invalid id format) |
| 401 | Missing, invalid or expired token, or wrong login |
| 403 | Role or scope not allowed, or temporary password must be changed first |
| 404 | Not found |
| 409 | Duplicate (second check-in, duplicate email or code, setup already done, finalized payroll) |
| 422 | Validation failed or business rule broken (overlap, over balance) |

Role and "active" status are checked in the database on every request, so deactivating a login works immediately.

## GET /setup/status (public)

```json
{ "success": true, "data": { "setupCompleted": false }, "message": "OK" }
```
Frontend: if `setupCompleted` is false, show the First-Run Setup screen instead of Login.

## POST /setup/first-run (public, only while no Admin exists)

Request:
```json
{ "companyName": "Acme Ltd", "timezone": "Asia/Dubai", "adminName": "Sara Khan", "email": "admin@acme.com", "password": "StrongPass1" }
```
`timezone` is optional. Response 201:
```json
{ "success": true, "message": "Company created",
  "data": { "token": "<jwt>", "user": { "id": "...", "name": "Sara Khan", "email": "admin@acme.com", "role": "admin", "employeeId": null, "isActive": true, "mustChangePassword": false } } }
```
Errors: 422 validation, 409 `Setup is already completed`.

## POST /auth/login (public, rate limited)

Request: `{ "email": "hr@acme.com", "password": "..." }`
Response 200: same `data` shape as above (`token` + `user`).
Error 401: `Invalid email or password` (same message for every failure).

If `user.mustChangePassword` is `true`, the frontend must send the user to the Change Password screen. Every other endpoint returns 403 until the password is changed.

## POST /auth/change-password (any logged-in user, also with temporary password)

Request: `{ "currentPassword": "Temp1234", "newPassword": "NewStrongPass1" }` (new password: 8 to 72 characters)
Response 200: `{ token, user }` with a fresh token. **Replace the stored token with this one.**
Error 422: wrong current password, or new password equals the old one.

## GET /auth/me (any logged-in user)

Response 200: `data` is the user object. Use it on page refresh to restore the session and role.

## Roles in the user object

`role` is `admin`, `hr` or `employee`. The frontend uses it only to pick menus; **the server enforces access**.


---

# M2 Org setup

Access: **Admin** can read and change. **HR** can read only. Employee gets 403. Every change is written to the audit log.

## Settings

`GET /settings` returns:
```json
{ "success": true, "data": { "id": "...", "companyName": "Acme Ltd", "timezone": "UTC", "officeStart": "09:00", "graceMinutes": 15,
  "halfDayHours": 5, "weekend": [0, 6], "office": { "lat": null, "lng": null, "radiusM": 150 } }, "message": "OK" }
```
`PUT /settings` (Admin): send **only the fields you want to change**. Unknown fields are rejected (422).
```json
{ "officeStart": "09:30", "graceMinutes": 10, "weekend": [5, 6], "office": { "lat": 24.86, "lng": 67.0, "radiusM": 150 } }
```
Rules: `officeStart` is `HH:MM`, `weekend` uses 0 = Sunday ... 6 = Saturday, `graceMinutes` 0 to 120, `halfDayHours` 1 to 12, `radiusM` 10 to 5000. Changes apply to **new records only**.

## Departments, designations, leave types, holidays

Same 4 endpoints for each: `GET /{resource}`, `POST /{resource}` (201), `PUT /{resource}/:id`, `DELETE /{resource}/:id`.
Resources: `/departments`, `/designations`, `/leave-types`, `/holidays`. Duplicate name, key or date returns **409**. Unknown id returns 404. `PUT` accepts partial fields.

| Resource | Create body | Notes |
|---|---|---|
| `/departments` | `{ "name": "Engineering" }` | Name is unique, not case sensitive |
| `/designations` | `{ "name": "Developer", "departmentId": "<id or null>" }` | Unknown department returns 422 |
| `/leave-types` | `{ "key": "annual", "name": "Annual", "yearlyQuota": 14, "paid": true }` | `yearlyQuota: null` = unlimited. `key` cannot be changed later |
| `/holidays` | `{ "date": "2026-12-25", "name": "Holiday" }` | `date` must be a real `YYYY-MM-DD` date, sorted by date |

At first-run the system creates the 4 policy defaults: **annual 14, sick 8, casual 10, unpaid (unlimited)**. Admin can edit the quotas.

## Users (Admin only)

| Endpoint | What it does |
|---|---|
| `GET /users?role=hr` | List logins (`role` optional) |
| `POST /users/hr` | Body `{ "name": "Hina", "email": "hr@acme.com" }` returns 201 with `{ user, temporaryPassword }` |
| `PATCH /users/:id/deactivate` | Login stops working immediately |
| `PATCH /users/:id/activate` | Turns it back on |
| `POST /users/:id/reset-password` | Returns `{ user, temporaryPassword }`, user must change it at next login |

**`temporaryPassword` is shown only once.** Show it to the Admin in a copy box and do not store it in the frontend. You cannot deactivate or reset your own login (422).
