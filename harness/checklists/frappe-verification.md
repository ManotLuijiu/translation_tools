# Frappe Verification Checklist

## Code

- [ ] Backend method exists.
- [ ] Backend method validates input.
- [ ] Backend method validates permission.
- [ ] Backend method prevents duplicate records.
- [ ] Backend method handles missing data.
- [ ] Frontend calls backend method correctly.
- [ ] Frontend does not contain business logic.

## DocTypes

- [ ] Required fields are mapped.
- [ ] Child tables are mapped.
- [ ] Link fields point to correct DocTypes.
- [ ] Naming behavior is clear.

## Tests

- [ ] Success case tested.
- [ ] Failure case tested.
- [ ] Duplicate case tested.
- [ ] Child table mapping tested.

## Safety

- [ ] No migration run without approval.
- [ ] No commit run without approval.
- [ ] No production data modified.
- [ ] No destructive command used.
