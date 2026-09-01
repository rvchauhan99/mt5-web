"use client";

import { useCallback, useMemo, useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { AutocompleteField, type AutocompleteOption } from "@/components/common/AutocompleteField";
import { FieldError } from "@/components/common/FieldError";
import { FieldLabel } from "@/components/common/FieldLabel";
import { FormActions, FormContainer } from "@/components/common/FormContainer";
import { FormGrid } from "@/components/common/FormGrid";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getApiErrorMessage } from "@/lib/apiError";
import { listPlayerLookupOptions } from "@/services/lookupService";
import { getPlayerById, listPlayersNormalized, updatePlayer } from "@/services/playerService";
import type { PlayerUserType } from "@/types/player";

export function PlayerEditClient() {
  const [playerRecordId, setPlayerRecordId] = useState("");
  const [selectedPlayerOption, setSelectedPlayerOption] = useState<AutocompleteOption | null>(null);
  const [exchangeLabel, setExchangeLabel] = useState("");
  const [playerIdLabel, setPlayerIdLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState<PlayerUserType>("trader");
  const [referredByPlayerId, setReferredByPlayerId] = useState("");
  const [referralPercentage, setReferralPercentage] = useState("0");
  const [errors, setErrors] = useState<{
    player?: string;
    phone?: string;
    email?: string;
    userType?: string;
    referralPercentage?: string;
  }>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setPlayerRecordId("");
    setSelectedPlayerOption(null);
    setExchangeLabel("");
    setPlayerIdLabel("");
    setPhone("");
    setEmail("");
    setUserType("trader");
    setReferredByPlayerId("");
    setReferralPercentage("0");
    setErrors({});
  }, []);

  const loadReferrerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const rows = await listPlayerLookupOptions({ q: query || undefined, limit: 10, userType: "ib" });
      return rows.map((p) => ({ value: p.id, label: `${p.playerId} · ${p.phone} · ${p.exchangeName}` }));
    } catch {
      return [];
    }
  }, []);

  const loadPlayerOptions = useCallback(async (query: string): Promise<AutocompleteOption[]> => {
    try {
      const res = await listPlayersNormalized({
        page: 1,
        limit: 25,
        q: query || undefined,
        sortBy: "playerId",
        sortOrder: "asc",
      });
      return res.data
        .map((p) => ({
          value: String(p._id ?? p.id ?? "").trim(),
          label: `${p.playerId} · ${p.phone}`,
        }))
        .filter((o): o is AutocompleteOption => o.value.length > 0);
    } catch {
      return [];
    }
  }, []);

  const resolveOptionByValue = useCallback(async (value: string): Promise<AutocompleteOption | null> => {
    const id = value.trim();
    if (!id) return null;
    try {
      const row = await getPlayerById(id);
      return { value: id, label: `${row.playerId} · ${row.phone}` };
    } catch {
      return null;
    }
  }, []);

  const onPlayerChange = useCallback(
    async (value: string) => {
      const id = value.trim();
      setPlayerRecordId(id);
      setErrors((prev) => ({ ...prev, player: undefined }));
      if (!id) {
        setSelectedPlayerOption(null);
        setExchangeLabel("");
        setPlayerIdLabel("");
        setPhone("");
        setEmail("");
        setUserType("trader");
        return;
      }

      setLoadingDetails(true);
      try {
        const row = await getPlayerById(id);
        setSelectedPlayerOption({ value: id, label: `${row.playerId} · ${row.phone}` });
        const exchangeText =
          row.exchange && typeof row.exchange === "object"
            ? `${row.exchange.name ?? ""}${row.exchange.provider ? ` (${row.exchange.provider})` : ""}`.trim()
            : String(row.exchange ?? "");
        setExchangeLabel(exchangeText);
        setPlayerIdLabel(row.playerId);
        setPhone(row.phone);
        setEmail(row.email ?? "");
        setUserType(row.userType === "ib" ? "ib" : "trader");
        const referredBy =
          typeof row.referredByPlayerId === "string"
            ? row.referredByPlayerId
            : row.referredByPlayerId?._id ?? "";
        setReferredByPlayerId(referredBy);
        setReferralPercentage(String(row.referralPercentage ?? 0));
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, "Failed to load trader details"));
      } finally {
        setLoadingDetails(false);
      }
    },
    [],
  );

  const canEdit = useMemo(() => playerRecordId.trim().length > 0, [playerRecordId]);

  const onSave = useCallback(async () => {
    const next: typeof errors = {};
    if (!playerRecordId.trim()) next.player = "Trader selection is required.";
    if (!phone.trim()) next.phone = "Phone number is required.";
    const emailTrim = email.trim();
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      next.email = "Enter a valid email address.";
    }
    if (userType !== "trader" && userType !== "ib") {
      next.userType = "User type is required.";
    }

    const referralPctNum = Number(referralPercentage);
    if (referralPercentage.trim() === "" || Number.isNaN(referralPctNum)) {
      next.referralPercentage = "Referral percentage is required.";
    } else if (referralPctNum < 0 || referralPctNum > 100) {
      next.referralPercentage = "Referral percentage must be between 0 and 100.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      await updatePlayer(playerRecordId.trim(), {
        phone: phone.trim(),
        email: email.trim() || null,
        userType,
        regularBonusPercentage: 0,
        firstDepositBonusPercentage: 0,
        referredByPlayerId: referredByPlayerId || null,
        referralPercentage: referralPctNum,
      });
      toast.success("Trader updated successfully.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to update trader"));
    } finally {
      setSaving(false);
    }
  }, [playerRecordId, phone, email, userType, referredByPlayerId, referralPercentage]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 pb-4">
      <FormContainer title="Edit Exchange Trader" description="Select a trader and update editable details." contentOverflow="visible" className="flex-none">
        <FormGrid>
          <div>
            <FieldLabel>Select Trader *</FieldLabel>
            <AutocompleteField
              value={playerRecordId}
              onChange={(v) => {
                void onPlayerChange(v);
              }}
              loadOptions={loadPlayerOptions}
              autoSelectSingleOption
              resolveOptionByValue={resolveOptionByValue}
              defaultOption={selectedPlayerOption}
              placeholder="search..."
              disabled={saving}
            />
            <FieldError message={errors.player} />
          </div>
          <div>
            <FieldLabel>Exchange *</FieldLabel>
            <Input value={exchangeLabel} disabled placeholder={loadingDetails ? "Loading..." : "Exchange"} />
          </div>
          <div>
            <FieldLabel>Trader Wallet Id *</FieldLabel>
            <Input value={playerIdLabel} disabled placeholder={loadingDetails ? "Loading..." : "Trader Wallet Id"} />
          </div>
          <div>
            <FieldLabel>Phone Number *</FieldLabel>
            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!canEdit || saving || loadingDetails}
            />
            <FieldError message={errors.phone} />
          </div>
          <div>
            <FieldLabel>Email ID</FieldLabel>
            <Input
              type="email"
              placeholder="Email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!canEdit || saving || loadingDetails}
              aria-label="Email ID"
            />
            <FieldError message={errors.email} />
          </div>
          <div>
            <FieldLabel>User type *</FieldLabel>
            <select
              className="h-9 w-full rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm"
              value={userType}
              onChange={(e) => setUserType(e.target.value === "ib" ? "ib" : "trader")}
              disabled={!canEdit || saving || loadingDetails}
              aria-label="User type"
            >
              <option value="trader">Trader</option>
              <option value="ib">IB</option>
            </select>
            <FieldError message={errors.userType} />
          </div>
          <div>
            <FieldLabel>IB Trader Wallet Id</FieldLabel>
            <AutocompleteField
              value={referredByPlayerId}
              onChange={setReferredByPlayerId}
              loadOptions={loadReferrerOptions}
              autoSelectSingleOption
              placeholder="search IB..."
              disabled={!canEdit || saving || loadingDetails}
            />
          </div>
          <div>
            <FieldLabel>Referral Percentage for IB *</FieldLabel>
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              placeholder="0"
              value={referralPercentage}
              onChange={(e) => setReferralPercentage(e.target.value)}
              disabled={!canEdit || saving || loadingDetails}
            />
            <FieldError message={errors.referralPercentage} />
          </div>
        </FormGrid>
        <FormActions className="justify-between px-5 py-4">
          <Button
            type="button"
            loading={saving}
            startIcon={<IconCheck size={18} />}
            onClick={() => void onSave()}
            disabled={loadingDetails || !canEdit}
          >
            Save
          </Button>
          <Button 
            type="button" 
            variant="secondary" 
            startIcon={<IconX size={18} />} 
            onClick={resetForm} 
            disabled={saving}
          >
            Clear
          </Button>
        </FormActions>
      </FormContainer>
    </div>
  );
}
