"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button, Input, Text } from "@/components";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/auth/supabase";
import { useAuth } from "@/features/auth";
import type { CreateContactSubmissionInput } from "@/lib/api/types";

export default function ContactsPage() {
  const { user } = useAuth();

  const [nameInput, setNameInput] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const name = nameInput !== null ? nameInput : (user?.display_name ?? "");
  const email = emailInput !== null ? emailInput : (user?.email ?? "");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError("Please enter your name (at least 2 characters).");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!trimmedMessage || trimmedMessage.length < 5) {
      setError("Please enter a message (at least 5 characters).");
      return;
    }

    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      setError(
        "Contact service is currently unavailable. Please try again later.",
      );
      return;
    }

    setLoading(true);
    try {
      const payload: CreateContactSubmissionInput = {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone ? trimmedPhone : null,
        message: trimmedMessage,
        user_id: user?.id ?? null,
      };

      const { error: insertError } = await supabase
        .from("contact_submissions")
        .insert([payload]);

      if (insertError) {
        throw new Error(insertError.message || "Failed to submit message.");
      }

      setSuccess("Thank you! Your message has been sent successfully.");
      setNameInput(null);
      setEmailInput(null);
      setPhone("");
      setMessage("");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while sending your message.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-20">
      <Image
        src="/static-assets/frosted-hero-r.webp"
        alt="VirtuJudge hero image"
        width={1550}
        height={2728}
        loading="lazy"
        className="absolute right-0 w-1/3 hidden lg:block"
      />

      <div className="flex flex-col gap-20">
        <span>
          <Text as="h1" size="subheadline">
            <b>Contact Us</b>
          </Text>
          <Text as="p" size="body">
            If you have any questions or feedback, please contact us
          </Text>
        </span>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5 w-full lg:w-1/2"
        >
          {error && (
            <Text
              role="alert"
              className="w-full p-3 rounded-2xl bg-danger/20 border border-danger/40 text-danger-lighter text-center"
            >
              {error}
            </Text>
          )}

          {success && (
            <Text
              role="status"
              className="w-full p-3 rounded-2xl bg-primary/5 border border-success/20 text-primary/90 text-center"
            >
              {success}
            </Text>
          )}

          <Input
            label="Name"
            placeholder="Enter your name"
            type="text"
            className="w-full"
            value={name}
            onChange={(e) => setNameInput(e.target.value)}
            disabled={loading}
            required
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            type="email"
            className="w-full"
            value={email}
            onChange={(e) => setEmailInput(e.target.value)}
            disabled={loading}
            required
          />
          <Input
            label="Phone"
            placeholder="Enter your phone number"
            type="tel"
            className="w-full"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
          <Input
            label="Message"
            placeholder="Enter your message"
            className="w-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
            required
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full mt-10"
            loading={loading}
            disabled={loading}
          >
            Send Message
          </Button>
        </form>
      </div>
    </div>
  );
}
