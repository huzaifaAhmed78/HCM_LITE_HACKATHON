# HCM-Lite M3 implementation notes

## 1. Employee CSV import/export

- HR can choose a CSV file from Employees and run **Validate CSV** before importing.
- Required headers: `name,email,departmentId,designationId,basic`.
- Optional headers: `phone,address,joiningDate`.
- `departmentId` and `designationId` must be existing MongoDB ObjectIds.
- Dry-run validation reports invalid rows and does not create employee accounts.
- The UI allows valid rows to be imported even if other rows have errors; invalid rows are skipped and returned in the error report.
- HR can import rows and receives temporary passwords in the immediate import response. Save them securely; they are not re-exported.
- HR/Admin can export the employee list to CSV. Export writes an audit event and protects text cells that begin with spreadsheet formula characters.

A sample header is provided in `employees-import-template.csv`. Replace the example IDs with actual IDs from your database.

## 2. Payroll calculation verification

- Admin can configure HRA and medical allowance percentages in Company Settings. Defaults are HRA = 40% of basic and medical = 10%; gross = basic + both allowances. Rates are snapshotted into each payroll run, so finalized records are stable.
- Attendance deduction retained: absent days + unpaid leave days + half of each half-day, multiplied by gross/working-days.
- Tax policy remains illustrative: annual gross-income slabs are 0% up to Rs 600,000; 5% on the amount above Rs 600,000 through Rs 1,200,000; then 15%, 25%, and 35% marginal bands with the existing cumulative base amounts in `annualTax`. Monthly tax is annual tax divided by 12, then prorated by eligible/working days. This is a project assumption, not tax/legal advice.
- Attendance deduction = (absent days + unpaid leave days + 0.5 × half-days) × (monthly gross / working days). Payslip PDF reads saved payroll item values and shows the allowance rates/assumptions snapshotted for that run.
- Calculation now rejects negative/non-finite inputs, eligible days above working days, and deductions exceeding eligible working days.
- Finalization remains admin-only and uses a conditional `status: draft` update, preventing a finalized run from being redrafted or finalized twice.
- Payslip access for employees remains limited to their own finalized payslip.

## 3. Notifications and audit

- Leave apply and decisions already create audit entries and notifications.
- Cancelling a pending leave request now also notifies HR.
- CSV import/export are audited. Basic salary changes emit both the employee update audit and a dedicated `employee.salary_update` event.
- Existing notification ownership checks remain in place for read operations; notification links navigate in the frontend.
- Existing audit screen remains admin-only.

## Verification notes

- `node --check` passed for all 85 backend JavaScript files in this exported source.
- The full backend test suite could not complete in this environment because project dependencies (including `mongoose`) are not installed in the uploaded archive. Run `npm ci` in `backend` and `frontend` on your machine, then run `npm test` and `npm run build`.


## Verification checklist

- [ ] Run `npm ci` in `backend`, then `npm test`.
- [ ] Run `npm ci` in `frontend`, then `npm run build`.
- [ ] In Company Settings, set non-default allowance rates, draft a payroll, and confirm the PDF values/rates match the saved run.
- [ ] Upload a CSV containing one valid row, one duplicate email, and one bad department/designation ID; confirm the valid row imports and errors are reported.
- [ ] Test as Employee A that Employee B's profile and payslip are not accessible; test notification ownership and audit screen as HR/Admin.
