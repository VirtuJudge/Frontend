"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, Input, Text } from "@/components";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, AuthContainer } from "@/features/auth";
import { cn } from "@/lib/utils";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const OTP_LENGTH = 8;

const emailSchema = z.object({
  email: z.string().min(1, "Please enter your email address").email("Invalid email address"),
});

const otpSchema = z.object({
  otp: z
    .string()
    .length(OTP_LENGTH, "Please enter all 8 numbers of the verification code")
    .regex(/^\d{8}$/, "Please enter all 8 numbers of the verification code"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { resetPassword, verifyPasswordRecoveryOtp } = useAuth();

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const savedEmail = emailForm.getValues("email");
  const otpValue = useWatch({ control: otpForm.control, name: "otp" }) || "";
  const otpArray = Array.from({ length: OTP_LENGTH }, (_, i) => otpValue[i] || "");

  const emailError = emailForm.formState.errors.root?.message || emailForm.formState.errors.email?.message;
  const otpError = otpForm.formState.errors.root?.message || otpForm.formState.errors.otp?.message;
  const currentError = submitted ? otpError : emailError;
  const isEmailLoading = emailForm.formState.isSubmitting;
  const isOtpLoading = otpForm.formState.isSubmitting;

  useEffect(() => {
    if (submitted) {
      inputRefs.current[0]?.focus();
    }
  }, [submitted]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, val: string) => {
    const digits = val.replace(/\D/g, "").split("");
    if (otpError) otpForm.clearErrors();

    const nextOtp = [...otpArray];
    if (digits.length === 0) {
      nextOtp[index] = "";
    } else {
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) nextOtp[index + i] = d;
      });
    }
    const nextOtpValue = nextOtp.join("");
    otpForm.setValue("otp", nextOtpValue, { shouldValidate: nextOtpValue.length === OTP_LENGTH });

    const nextIndex = Math.min(index + Math.max(digits.length, 1), OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const nextOtp = [...otpArray];
      if (nextOtp[index]) {
        nextOtp[index] = "";
      } else if (index > 0) {
        nextOtp[index - 1] = "";
        inputRefs.current[index - 1]?.focus();
      }
      otpForm.setValue("otp", nextOtp.join(""));
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;

    if (otpError) otpForm.clearErrors();
    const newOtpArray = Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] || "");
    otpForm.setValue("otp", newOtpArray.join(""));
    inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const onEmailSubmit = async (data: EmailFormValues) => {
    try {
      setSuccessMessage(null);
      await resetPassword(data.email.trim());
      setSubmitted(true);
      setResendCooldown(60);
      otpForm.setValue("otp", "");
    } catch (err: unknown) {
      emailForm.setError("root", {
        message: err instanceof Error ? err.message : "Failed to send reset code",
      });
    }
  };

  const onOtpSubmit = async (data: OtpFormValues) => {
    try {
      await verifyPasswordRecoveryOtp(savedEmail.trim(), data.otp);
      router.push("/auth/reset-password");
    } catch (err: unknown) {
      otpForm.setError("root", {
        message: err instanceof Error ? err.message : "Failed to verify reset code",
      });
    }
  };

  const handleResend = async () => {
    if (!savedEmail) {
      otpForm.setError("root", { message: "Please enter your email address to resend reset code" });
      return;
    }
    if (resendCooldown > 0 || resending) return;

    try {
      setResending(true);
      otpForm.clearErrors();
      setSuccessMessage(null);
      await resetPassword(savedEmail.trim());
      setSuccessMessage(`A new 8-digit verification code has been sent to ${savedEmail.trim()}`);
      setResendCooldown(60);
    } catch (err: unknown) {
      otpForm.setError("root", {
        message: err instanceof Error ? err.message : "Failed to resend reset code",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthContainer>
      <Text size="lg">Reset Password</Text>

      <Text className="w-full px-8 text-center text-fg-light/80">
        Enter the email address associated with your account to receive a password reset code.
      </Text>

      {currentError && (
        <Text
          role="alert"
          className="w-full p-3 rounded-2xl bg-danger/20 border border-danger/40 text-danger-lighter text-center"
        >
          {currentError}
        </Text>
      )}

      {successMessage && (
        <Text
          role="status"
          className="w-full p-3 rounded-2xl bg-success/20 border border-success/40 text-success-lighter text-center"
        >
          {successMessage}
        </Text>
      )}

      {submitted ? (
        <div className="flex flex-col items-center gap-6 w-full px-8 text-center">
          <Text
            role="status"
            className="w-full p-4 rounded-2xl bg-primary/20 border border-primary/40 text-primary-lighter"
          >
            If an account with{" "}
            <span className="inline-block align-bottom max-w-[20ch] sm:max-w-[30ch] md:max-w-[40ch] truncate">
              {" "}
              {savedEmail}
            </span>{" "}
            exists, a password reset email has been sent. Enter its code below to continue.
          </Text>

          <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="flex flex-col items-center gap-6 w-full">
            <div className="flex flex-col items-center gap-4 w-full">
              <Text as="label">Verification Code</Text>

              <div
                className="flex items-center justify-center gap-2 w-full"
                role="group"
                aria-label="8-digit verification code"
              >
                {otpArray.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    disabled={isOtpLoading}
                    aria-label={`Digit ${index + 1}`}
                    className={cn(
                      "w-9 h-9 sm:w-12 sm:h-12 align-middle text-center font-bold",
                      "rounded-full bg-glass border transition-all duration-150",
                      "outline-none focus:outline-none focus:border-primary text-md sm:text-lg",
                      currentError
                        ? "border-danger/60"
                        : digit
                          ? "border-primary/80 shadow-[0_0_8px_rgba(6,249,228,0.2)]"
                          : "border-white/10 hover:border-white/30",
                      isOtpLoading && "opacity-50 cursor-not-allowed",
                    )}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isOtpLoading || otpValue.length !== OTP_LENGTH}
              loading={isOtpLoading}
            >
              {isOtpLoading ? "Verifying code..." : "Verify Code"}
            </Button>

            <Button
              type="button"
              onClick={handleResend}
              disabled={isOtpLoading || resending || resendCooldown > 0}
              className="text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity w-full"
            >
              {resendCooldown > 0
                ? `Resend code in ${resendCooldown}s`
                : resending
                  ? "Sending code..."
                  : "Resend reset code"}
            </Button>
          </form>
        </div>
      ) : (
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="flex flex-col items-center gap-6 w-full">
          <Input
            label="Email"
            type="email"
            placeholder="Enter your email address"
            className="w-full"
            disabled={isEmailLoading}
            required
            {...emailForm.register("email")}
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2"
            disabled={isEmailLoading}
            loading={isEmailLoading}
          >
            {isEmailLoading ? "Sending reset code..." : "Send Reset Code"}
          </Button>
        </form>
      )}

      <Text size="xs">
        Remembered your password?{" "}
        <Link href="/auth/login" className="underline">
          Back to Login
        </Link>
      </Text>
    </AuthContainer>
  );
}
