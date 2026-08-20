# Help Platform Auth API Flow

## 1. Start registration

POST /api/auth/register/email

Body:
{
  "email": "user@example.com"
}

Creates a temporary Registration document and sends a 6-digit email code.

## 2. Verify email

POST /api/auth/register/verify-email

Body:
{
  "email": "user@example.com",
  "code": "123456"
}

Registration is marked verified.

## 3. Complete account

POST /api/auth/register/complete

Body:
{
  "email": "user@example.com",
  "username": "vivekhelp",
  "password": "StrongPassword123!",
  "confirmPassword": "StrongPassword123!"
}

Creates the permanent User document and returns a JWT.

## 4. Profile

PATCH /api/users/profile

Authorization:
Bearer <accessToken>

Body:
{
  "name": "Vivek Kumar",
  "profilePhoto": "https://..."
}

## 5. Location

PATCH /api/users/location

Authorization:
Bearer <accessToken>

Body:
{
  "latitude": 28.7041,
  "longitude": 77.1025
}

## 6. Login

POST /api/auth/login

Body:
{
  "identifier": "vivekhelp",
  "password": "StrongPassword123!"
}

`identifier` accepts username or email.

## 7. Forgot password

POST /api/auth/forgot-password

Body:
{
  "email": "user@example.com"
}

## 8. Reset password

POST /api/auth/reset-password

Body:
{
  "token": "<raw-reset-token>",
  "password": "NewStrongPassword123!",
  "confirmPassword": "NewStrongPassword123!"
}
