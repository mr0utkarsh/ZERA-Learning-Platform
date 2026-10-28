-- Widen token columns to accommodate JWT-sized password reset and verification tokens
ALTER TABLE `PasswordResetToken` MODIFY `token` VARCHAR(500) NOT NULL;

ALTER TABLE `VerificationToken` MODIFY `token` VARCHAR(500) NOT NULL;
