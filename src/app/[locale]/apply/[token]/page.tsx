"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

interface ApplyProgram {
  name: string;
  description: string | null;
  tenantName: string;
  canRegister: boolean;
  registrationOpen: boolean;
  seatsAvailable: boolean;
  programCapacityAvailable: boolean;
}

export default function ApplyPage() {
  const params = useParams<{ token: string; locale: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<ApplyProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
  });

  useEffect(() => {
    async function loadProgram() {
      const res = await fetch(`/api/apply/${params.token}`);
      if (!res.ok) {
        setProgram(null);
        setLoading(false);
        return;
      }
      setProgram(await res.json());
      setLoading(false);
    }
    loadProgram();
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/registration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: params.token,
        ...form,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json();
      if (data.code === "SEAT_LIMIT_REACHED") {
        toast.error("Seat limit reached for this organization.");
      } else {
        toast.error(data.error ?? "Registration failed");
      }
      return;
    }

    toast.success("Registration successful. You can now sign in.");
    router.push(`/${params.locale}/login`);
  }

  if (loading) return null;

  if (!program) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Program not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA] p-4 dark:bg-background">
      <Card className="w-full max-w-lg rounded-2xl border-0 shadow-xl">
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          <CardDescription>{program.tenantName}</CardDescription>
          {program.description && (
            <p className="text-sm text-muted-foreground">{program.description}</p>
          )}
        </CardHeader>
        <CardContent>
          {!program.canRegister ? (
            <p className="text-sm text-destructive">
              {!program.registrationOpen && "Registration is closed for this program."}
              {program.registrationOpen && !program.seatsAvailable && "Organization seat limit reached."}
              {program.registrationOpen &&
                program.seatsAvailable &&
                !program.programCapacityAvailable &&
                "Program participant limit reached."}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    required
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    required
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full rounded-xl" disabled={submitting}>
                {submitting ? "..." : "Register"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
