import { Check, ChevronRight, LoaderCircle, Mail, Send, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { sharedAccountApi } from "../../api/sharedAccountApi";
import { serviceApi } from "../../api/serviceApi";
import { notifyError, notifySuccess } from "../../services/notificationService";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "../ui/dialog";
import { OtpInput } from "./OtpInput";

export function SharedAccountJoinDialog({ sponsor, onClose }: { sponsor: string; onClose: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [validatedEmail, setValidatedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const pending = useRef(false);

  useEffect(() => {
    if (!resendAt) return;
    const tick = () => setSecondsRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);

  const run = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await action();
    } catch (failure) {
      notifyError(failure instanceof Error ? failure.message : "Unable to process your request. Please try again.", "shared-account-error");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  const requestOtp = () => run(async () => {
    if (Date.now() < resendAt) return;
    await serviceApi.sendSharedAccountOtp(validatedEmail);
    setOtp("");
    setSecondsRemaining(60);
    setResendAt(Date.now() + 60_000);
    setStep(3);
    notifySuccess(`Verification code sent to ${validatedEmail}.`, "shared-account-otp-success");
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step === 1) {
      const normalizedEmail = email.trim().toLowerCase();
      if (!z.string().email().max(100).safeParse(normalizedEmail).success) {
        notifyError(normalizedEmail ? "Enter a valid email address (maximum 100 characters)." : "Email address is required.", "shared-account-email-error");
        return;
      }
      void run(async () => {
        await sharedAccountApi.validate(normalizedEmail, sponsor);
        setValidatedEmail(normalizedEmail);
        setStep(2);
        notifySuccess("Email validated successfully.", "shared-account-validation-success");
      });
    } else if (step === 2) {
      void requestOtp();
    } else {
      if (!/^\d{6}$/.test(otp)) {
        notifyError("Enter the 6-digit verification code.", "shared-account-otp-error");
        return;
      }
      void run(async () => {
        await sharedAccountApi.complete(validatedEmail, sponsor, otp);
        notifySuccess("Registration successful. You can now log in to theTrust using your theWill account.", "shared-account-registration-success");
        navigate("/login", { replace: true });
      });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending.current) onClose(); }}>
      <DialogContent className="bg-white sm:p-7" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }}>
        <form noValidate onSubmit={submit} className="grid max-h-[calc(100dvh-6rem)] gap-6 overflow-y-auto">
          <div className="flex items-start gap-4 pr-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brandGold/15 text-[#B78619]">
              {step === 3 ? <ShieldCheck className="h-7 w-7" /> : <Mail className="h-7 w-7" />}
            </span>
            <div>
              <DialogTitle>{step === 1 ? "Join using theWill account" : step === 2 ? "Email verified" : "Enter Verification Code"}</DialogTitle>
              <DialogDescription className="mt-1">
                {step === 1 ? "Enter your theWill registered email to join theTrust." : step === 2 ? "We have verified that this email is registered with theWill." : <>We have sent a 6-digit verification code to<strong className="block break-words text-textPrimary">{validatedEmail}</strong>Please enter the code below to continue.</>}
              </DialogDescription>
            </div>
          </div>

          {step === 1 ? (
            <label className="block text-sm font-medium text-textPrimary">
              Email Address <span className="text-red-600">*</span>
              <input type="email" autoComplete="email" required maxLength={100} value={email} disabled={busy} onChange={(event) => setEmail(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 focus:border-ink focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ink" />
              <span className="mt-1.5 block text-xs font-normal text-textSecondary">We will check if this email is registered with theWill.</span>
            </label>
          ) : step === 2 ? (
            <div className="flex items-center gap-3 rounded-lg border border-brandGold/30 bg-brandGold/10 p-4 text-sm leading-6 text-[#805D12]">
              <Mail className="h-6 w-6 shrink-0" />
              <p className="min-w-0">We will send a 6-digit verification code to<strong className="block break-words text-textPrimary">{validatedEmail}</strong></p>
            </div>
          ) : (
            <fieldset disabled={busy} className="min-w-0 space-y-4">
              <OtpInput label="Verification Code" value={otp} onChange={(value) => setOtp(value.replace(/\D/g, "").slice(0, 6))} />
              <div className="rounded-lg border border-brandGold/30 bg-brandGold/10 p-3 text-sm leading-6 text-[#805D12]" aria-live="polite">
                {secondsRemaining > 0 ? <>Didn't receive the code? You can request a new code in <strong>{secondsRemaining} seconds.</strong></> : <>Didn't receive the code? <button type="button" onClick={() => void requestOtp()} disabled={busy} className="font-semibold underline underline-offset-2 disabled:opacity-60">Resend OTP</button></>}
              </div>
            </fieldset>
          )}

          <DialogFooter className="justify-between border-0 pt-1 sm:justify-between">
            <Button type="button" variant="outline" disabled={busy} onClick={() => {
              setOtp("");
              if (step === 1) onClose();
              else setStep(step === 3 ? 2 : 1);
            }}>{step === 1 ? "Cancel" : "Back"}</Button>
            <Button type="submit" disabled={busy || (step === 2 && secondsRemaining > 0) || (step === 3 && otp.length !== 6)} className="bg-brandGold px-6 text-white hover:bg-[#BE9B2C]">
              {busy ? <LoaderCircle className="animate-spin" /> : step === 2 ? <Send /> : step === 3 ? <Check /> : null}
              {busy ? "Processing..." : step === 1 ? "Validate Email" : step === 2 ? secondsRemaining > 0 ? `Request OTP in ${secondsRemaining}s` : "Request OTP" : "Verify & Register"}
              {step === 1 && !busy ? <ChevronRight /> : null}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
