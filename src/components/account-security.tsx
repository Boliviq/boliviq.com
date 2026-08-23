import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAccessState, useSessions, useVerifyPhone } from "@/hooks/use-identity";
import { useCurrentUser } from "@/hooks/use-current-user";

export function AccountSecurityCard() {
  const { email, emailConfirmed } = useCurrentUser();
  const access = useAccessState();
  const sessions = useSessions();
  const verifyPhone = useVerifyPhone();
  const [phone, setPhone] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [factors, setFactors] = useState<number>(0);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      setFactors(data?.totp.length ?? 0);
    });
  }, []);

  const resendEmail = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) toast.error(error.message);
    else toast.success("Verification email sent");
  };

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    toast.message("Scan the QR code, then enter a 6-digit code");
  };

  const verifyMfa = async () => {
    if (!factorId) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: mfaCode.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Authenticator app enrolled");
    setQr(null);
    setFactorId(null);
    setMfaCode("");
    setFactors((n) => n + 1);
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Security & verification</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="text-sm font-medium">Email</div>
          <p className="text-xs text-muted-foreground">
            {emailConfirmed ? "Email is confirmed." : "Email is not confirmed yet."}
          </p>
          {!emailConfirmed && (
            <Button size="sm" variant="outline" onClick={() => void resendEmail()}>
              Resend confirmation
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Phone</div>
          <p className="text-xs text-muted-foreground">
            {access.data?.phoneVerified
              ? "Phone number is marked verified on this profile."
              : "SMS delivery lands in Phase 10. Confirm the number you control."}
          </p>
          <div className="flex gap-2">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 0100"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!phone.trim() || verifyPhone.isPending}
              onClick={() =>
                verifyPhone.mutate(phone.trim(), {
                  onSuccess: () => toast.success("Phone marked verified"),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Could not verify"),
                })
              }
            >
              Confirm
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Password</div>
          <Link to="/forgot-password" className="text-sm underline">
            Send a password reset email
          </Link>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Authenticator (optional MFA)</div>
          <p className="text-xs text-muted-foreground">
            {factors > 0 ? `${factors} TOTP factor(s) enrolled.` : "Not enrolled."}
          </p>
          {!qr && (
            <Button size="sm" variant="outline" onClick={() => void enrollMfa()}>
              Enroll authenticator
            </Button>
          )}
          {qr && (
            <div className="space-y-2">
              <img src={qr} alt="MFA QR code" className="h-36 w-36 rounded border bg-white p-2" />
              <Label htmlFor="mfa">6-digit code</Label>
              <div className="flex gap-2">
                <Input
                  id="mfa"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  inputMode="numeric"
                />
                <Button size="sm" onClick={() => void verifyMfa()}>
                  Verify
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <div className="text-sm font-medium">Recent sessions</div>
          {(sessions.data ?? []).length === 0 && (
            <p className="text-xs text-muted-foreground">No recorded sessions yet.</p>
          )}
          <ul className="space-y-1 text-xs text-muted-foreground">
            {(sessions.data ?? []).map((s) => (
              <li key={s.id}>
                {new Date(s.createdAt).toLocaleString()} · {s.userAgent || "Unknown device"}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
