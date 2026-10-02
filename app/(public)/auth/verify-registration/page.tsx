"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, AuthContainer } from "@/features/auth";
import { Button, Input, Text } from "@/components";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const OTP_LENGTH = 8;

const verifySchema = z.object({
  email: z.string().min(1, "Please enter your email address").email("Invalid email address"),
  otp: z
    .string()
    .length(OTP_LENGTH, "Please enter all 8 numbers of the verification code")
    .regex(/^\d{8}$/, "Please enter all 8 numbers of the verification code"),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

export default function VerifyRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyRegistration, resendVerificationOtp, checkEmailVerificationStatus, isAuthenticated } = useAuth();

  const initialEmail = searchParams.get("email") || "";

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const form = useForm<VerifyFormValues>({
    resolver: zodResolver(verifySchema),
    defaultValues: { email: initialEmail, otp: "" },
  });

  const { formState: { isSubmitting, errors }, setValue, clearErrors, setError, handleSubmit, control } = form;

  const emailValue = useWatch({ control, name: "email" }) || "";
  const otpValue = useWatch({ control, name: "otp" }) || "";
  const otpArray = Array.from({ length: OTP_LENGTH }, (_, i) => otpValue[i] || "");

  const currentError = errors.root?.message || errors.email?.message || errors.otp?.message;

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/me");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, val: string) => {
    const digits = val.replace(/\D/g, "").split("");
    if (currentError) clearErrors();

    const nextOtp = [...otpArray];
    if (digits.length === 0) {
      nextOtp[index] = "";
    } else {
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) nextOtp[index + i] = d;
      });
    }
    const nextOtpValue = nextOtp.join("");
    setValue("otp", nextOtpValue, { shouldValidate: nextOtpValue.length === OTP_LENGTH });

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
      setValue("otp", nextOtp.join(""));
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

    if (currentError) clearErrors();
    const newOtpArray = Array.from({ length: OTP_LENGTH }, (_, i) => digits[i] || "");
    setValue("otp", newOtpArray.join(""));
    inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
  };

  const onSubmit = async (data: VerifyFormValues) => {
    try {
      clearErrors();
      await verifyRegistration({ email: data.email.trim(), otp: data.otp });

      router.replace(`/auth/login?verified=true&email=${encodeURIComponent(data.email.trim())}`);
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to verify registration",
      });
    }
  };

  const validateEmailStatus = useCallback(
    async (emailToCheck: string) => {
      const trimmed = emailToCheck.trim();
      if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
        return null;
      }

      try {
        const status = await checkEmailVerificationStatus(trimmed);
        if (!status.exists) {
          setError("root", {
            message: "No registered account found with this email. Please register first.",
          });
          return false;
        }
        if (status.isConfirmed || !status.waitingConfirmation) {
          setError("root", {
            message: "This email is already verified. Please log in.",
          });
          return false;
        }
        
        const rootMessage = errors.root?.message as string | undefined;
        if (rootMessage && (rootMessage.includes("No registered account") || rootMessage.includes("already verified"))) {
            clearErrors("root");
        }
        
        return true;
      } catch {
        return null;
      }
    },
    [checkEmailVerificationStatus, errors.root, setError, clearErrors],
  );

  useEffect(() => {
    const timer = setTimeout(() => validateEmailStatus(emailValue), 500);
    return () => clearTimeout(timer);
  }, [emailValue, validateEmailStatus]);

  const handleResend = async () => {
    const trimmedEmail = emailValue.trim();
    if (!trimmedEmail) {
      setError("root", { message: "Please enter your email address to resend verification code" });
      return;
    }
    if (resendCooldown > 0 || resending) return;

    try {
      setResending(true);
      clearErrors();
      setSuccessMessage(null);

      const isValid = await validateEmailStatus(trimmedEmail);
      if (isValid === false) return;

      await resendVerificationOtp(trimmedEmail);
      setSuccessMessage(`A new 8-digit verification code has been sent to ${trimmedEmail}`);
      setResendCooldown(60);
    } catch (err: unknown) {
      setError("root", {
        message: err instanceof Error ? err.message : "Failed to resend verification code",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthContainer>
      <Text size="lg" className="text-center">Verify your registration</Text>

      <Text className="w-full px-8 text-center text-fg-light/80">
        Please enter the 8-digit OTP sent to your email address to verify your registration. If you did not receive the OTP, please check your spam folder or request a new one.
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

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center gap-6 w-full max-w-120">
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email address"
          className="w-full"
          disabled={isSubmitting}
          required
          {...form.register("email", {
            onChange: () => setSuccessMessage(null),
            onBlur: () => validateEmailStatus(emailValue),
          })}
        />

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
                disabled={isSubmitting}
                aria-label={`Digit ${index + 1}`}
                className={cn(
                  "w-9 h-9 sm:w-12 sm:h-12 align-middle text-center font-bold ",
                  "rounded-full bg-glass border transition-all duration-150",
                  "outline-none focus:outline-none focus:border-primary text-md sm:text-lg",
                  currentError
                    ? "border-danger/60"
                    : digit
                      ? "border-primary/80 shadow-[0_0_8px_rgba(6,249,228,0.2)]"
                      : "border-white/10 hover:border-white/30",
                  isSubmitting && "opacity-50 cursor-not-allowed",
                )}
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2"
          disabled={isSubmitting || otpValue.length !== OTP_LENGTH}
          loading={isSubmitting}
        >
          {isSubmitting ? "Verifying..." : "Verify Registration"}
        </Button>

        <div className="flex flex-col items-center justify-between w-full text-xs">
          <Button
            type="button"
            onClick={handleResend}
            disabled={isSubmitting || resending || resendCooldown > 0}
            className="text-primary disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-opacity w-full"
          >
            {resendCooldown > 0
              ? `Resend code in ${resendCooldown}s`
              : resending
                ? "Sending code..."
                : "Resend verification code"}
          </Button>
        </div>
      </form>

      <Text size="xs">
        Already verified?{" "}
        <Link href="/auth/login" className="underline">
          Log in here!
        </Link>
      </Text>
    </AuthContainer>
  );
}
