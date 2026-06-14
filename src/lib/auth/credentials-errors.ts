import { CredentialsSignin } from "next-auth";

export class TwoFactorRequiredError extends CredentialsSignin {
  code = "two_factor_required";
}

export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}
