"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  LocateFixed,
  Map,
  MapPin,
  MapPinned,
  Package,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

const SESSION_KEY = "kanxi-next-user";

function emptyOtpState() {
  return {
    step: "phone",
    phone: "",
    phoneDigits: "",
    requestId: null,
    profile: {
      name: "",
      gender: "",
      dob: "",
      line: "",
      city: "",
      atoll: "",
      postcode: "",
      country: "Maldives",
      lat: null,
      lng: null,
    },
  };
}

function emptyAddress() {
  return {
    id: "",
    label: "Home",
    line: "",
    city: "",
    atoll: "",
    postcode: "",
    country: "Maldives",
    lat: null,
    lng: null,
    isDefault: true,
    deliveryType: "address",
    deliveryInfo: { boatName: "", contactNumber: "", departureTime: "", note: "" },
  };
}

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 7);
}

function phoneForApi(value) {
  const digits = phoneDigits(value);
  return digits.length === 7 ? `960${digits}` : digits;
}

function initials(name) {
  return (name || "KC")
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function joinAddressLines(address) {
  if (!address) return [];
  return [
    address.line,
    [address.city, address.atoll].filter(Boolean).join(", "),
    [address.postcode, address.country].filter(Boolean).join(" · "),
  ].filter(Boolean);
}

function formatPrice(value) {
  return `MVR ${Math.round(Number(value || 0)).toLocaleString()}`;
}

async function reverseLookup(lat, lng) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
    { headers: { Accept: "application/json" } },
  );
  const data = await response.json();
  const address = data.address || {};
  return {
    line:
      [address.house_number, address.road || address.neighbourhood || address.suburb].filter(Boolean).join(" ") ||
      data.display_name?.split(",").slice(0, 2).join(", ") ||
      "",
    city: address.city || address.town || address.village || address.county || "",
    atoll: address.state || address.region || "",
    postcode: address.postcode || "",
    country: address.country || "Maldives",
  };
}

function selectedSavedAddress(user, id) {
  return user?.addresses?.find((address) => address.id === id) || user?.addresses?.find((address) => address.isDefault) || user?.addresses?.[0] || null;
}

export function AccountPageClient() {
  const [savedUser, setSavedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [otpState, setOtpState] = useState(emptyOtpState());
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpBusy, setOtpBusy] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressDraft, setAddressDraft] = useState(emptyAddress());
  const [profileDraft, setProfileDraft] = useState({ name: "", gender: "", dob: "" });
  const [geoLoading, setGeoLoading] = useState(false);

  const activeAddress = useMemo(
    () => selectedSavedAddress(savedUser, editingAddressId),
    [editingAddressId, savedUser],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      const user = raw ? JSON.parse(raw) : null;
      if (!user?.phone) return;
      setSavedUser(user);
      setProfileDraft({
        name: user.name || "",
        gender: user.gender || "",
        dob: user.dob || "",
      });
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    const code = otpCode.join("");
    if (otpState.step === "otp" && code.length === 6 && !otpBusy) {
      const timer = window.setTimeout(() => verifyOtp(true), 120);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [otpBusy, otpCode, otpState.step]);

  useEffect(() => {
    if (!savedUser?.phone) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    setOrdersLoading(true);
    fetch(`/api/orders?phone=${savedUser.phone}`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setOrders(Array.isArray(data?.orders) ? data.orders : []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [savedUser]);

  function persistSession(user) {
    setSavedUser(user);
    setProfileDraft({
      name: user.name || "",
      gender: user.gender || "",
      dob: user.dob || "",
    });
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function logout() {
    setSavedUser(null);
    setOrders([]);
    setOtpState(emptyOtpState());
    setOtpCode(["", "", "", "", "", ""]);
    setEditingAddressId(null);
    window.localStorage.removeItem(SESSION_KEY);
  }

  async function loadUserByPhone(phone, options = {}) {
    const lookup = phoneDigits(phone);
    if (lookup.length !== 7) return null;
    const response = await fetch(`/api/profile?phone=${phoneForApi(lookup)}`, { cache: options.silent ? "no-store" : "default" });
    const data = await response.json();
    return data?.user || null;
  }

  async function sendOtp() {
    const digits = phoneDigits(otpState.phone);
    if (digits.length !== 7) {
      setError("Enter a valid 7-digit mobile number.");
      return;
    }
    setOtpBusy(true);
    setError("");
    try {
      const response = await fetch("/api/msgowl-send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneForApi(digits) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not send OTP");
      setOtpState((current) => ({
        ...current,
        step: "otp",
        phone: digits,
        phoneDigits: phoneForApi(digits),
        requestId: data.id || current.requestId || null,
      }));
      setOtpCode(["", "", "", "", "", ""]);
    } catch (nextError) {
      setError(nextError.message || "Could not send OTP");
    } finally {
      setOtpBusy(false);
    }
  }

  async function resendOtp() {
    const digits = phoneDigits(otpState.phone);
    if (digits.length !== 7) return;
    setOtpBusy(true);
    setError("");
    try {
      const path = otpState.requestId ? "/api/msgowl-resend-otp" : "/api/msgowl-send-otp";
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          otpState.requestId
            ? { phone_number: phoneForApi(digits), id: otpState.requestId }
            : { phone_number: phoneForApi(digits) },
        ),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not resend OTP");
      setOtpState((current) => ({ ...current, requestId: data.id || current.requestId || null }));
      setOtpCode(["", "", "", "", "", ""]);
    } catch (nextError) {
      setError(nextError.message || "Could not resend OTP");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtp(auto = false) {
    const digits = otpCode.join("");
    if (digits.length !== 6) {
      if (!auto) setError("Enter the 6-digit OTP.");
      return;
    }
    setOtpBusy(true);
    setError("");
    try {
      const response = await fetch("/api/msgowl-verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: otpState.phoneDigits, code: digits }),
      });
      const data = await response.json();
      if (!response.ok || data?.status !== true) {
        throw new Error(data?.error || data?.message || "Invalid OTP");
      }

      const existingUser = await loadUserByPhone(otpState.phone, { silent: true });
      if (existingUser) {
        persistSession(existingUser);
        setActiveTab("details");
        setOtpState(emptyOtpState());
        setOtpCode(["", "", "", "", "", ""]);
      } else {
        setOtpState((current) => ({
          ...current,
          step: "profile",
          profile: {
            ...current.profile,
            country: current.profile.country || "Maldives",
          },
        }));
      }
    } catch (nextError) {
      setError(nextError.message || "Could not verify OTP");
    } finally {
      setOtpBusy(false);
    }
  }

  function updateOtpDigit(index, value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length > 1) {
      const next = ["", "", "", "", "", ""];
      digits.slice(0, 6).split("").forEach((digit, digitIndex) => {
        next[digitIndex] = digit;
      });
      setOtpCode(next);
      return;
    }
    setOtpCode((current) => current.map((entry, entryIndex) => (entryIndex === index ? digits : entry)));
  }

  async function fillLocation(target) {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setGeoLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const lookup = await reverseLookup(lat, lng);
          if (target === "profile") {
            setOtpState((current) => ({
              ...current,
              profile: { ...current.profile, ...lookup, lat, lng },
            }));
          } else {
            setAddressDraft((current) => ({ ...current, ...lookup, lat, lng }));
          }
        } catch {
          if (target === "profile") {
            setOtpState((current) => ({
              ...current,
              profile: { ...current.profile, lat, lng, line: current.profile.line || `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}` },
            }));
          } else {
            setAddressDraft((current) => ({ ...current, lat, lng, line: current.line || `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
          }
        } finally {
          setGeoLoading(false);
        }
      },
      () => {
        setGeoLoading(false);
        setError("Could not fetch current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function saveOtpProfile() {
    const profile = otpState.profile;
    if (!profile.line.trim()) {
      setError("Enter address details.");
      return;
    }
    setOtpBusy(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name.trim() || "Kanxi Customer",
          phone: otpState.phoneDigits,
          gender: profile.gender || "",
          dob: profile.dob || "",
          addresses: [
            {
              id: "",
              label: "Home",
              line: profile.line.trim(),
              city: profile.city.trim(),
              atoll: profile.atoll.trim(),
              postcode: profile.postcode.trim(),
              country: (profile.country || "Maldives").trim(),
              lat: profile.lat,
              lng: profile.lng,
              isDefault: true,
              deliveryType: "address",
              deliveryInfo: emptyAddress().deliveryInfo,
            },
          ],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not save profile");
      persistSession(data.user);
      setActiveTab("details");
      setOtpState(emptyOtpState());
      setOtpCode(["", "", "", "", "", ""]);
    } catch (nextError) {
      setError(nextError.message || "Could not save profile");
    } finally {
      setOtpBusy(false);
    }
  }

  function openAddressEditor(address = null) {
    setEditingAddressId(address?.id || "");
    setAddressDraft(
      address
        ? {
            ...emptyAddress(),
            ...address,
            deliveryInfo: { ...emptyAddress().deliveryInfo, ...(address.deliveryInfo || {}) },
          }
        : emptyAddress(),
    );
  }

  function closeAddressEditor() {
    setEditingAddressId(null);
    setAddressDraft(emptyAddress());
  }

  async function saveAddress() {
    if (!savedUser) return;
    if (!addressDraft.line.trim()) {
      setError("Enter address details.");
      return;
    }
    const nextAddresses = [...(savedUser.addresses || [])];
    const draft = {
      ...addressDraft,
      label: addressDraft.label.trim() || "Address",
      line: addressDraft.line.trim(),
      city: addressDraft.city.trim(),
      atoll: addressDraft.atoll.trim(),
      postcode: addressDraft.postcode.trim(),
      country: (addressDraft.country || "Maldives").trim(),
    };
    const existingIndex = nextAddresses.findIndex((address) => address.id === editingAddressId);
    if (draft.isDefault) {
      nextAddresses.forEach((address) => {
        address.isDefault = false;
      });
    }
    if (existingIndex >= 0) nextAddresses[existingIndex] = draft;
    else nextAddresses.push({ ...draft, id: `a_${Math.random().toString(36).slice(2, 8)}` });

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...savedUser,
        ...profileDraft,
        addresses: nextAddresses,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error || "Could not save address");
      return;
    }
    persistSession(data.user);
    closeAddressEditor();
  }

  async function saveProfileSummary() {
    if (!savedUser) return;
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...savedUser,
        name: profileDraft.name.trim() || savedUser.name,
        gender: profileDraft.gender || "",
        dob: profileDraft.dob || "",
        addresses: savedUser.addresses || [],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data?.error || "Could not save profile");
      return;
    }
    persistSession(data.user);
  }

  return (
    <section className="account-page">
      {savedUser ? (
        <>
          <div className="account-hero">
            <div className="account-hero-avatar" aria-hidden="true">{initials(savedUser.name)}</div>
            <div className="account-hero-copy">
              <p className="placeholder-kicker">Kanxi Collection</p>
              <h1>{savedUser.name || "Kanxi Customer"}</h1>
              <span>{savedUser.phone ? `+${savedUser.phone}` : "Account"}</span>
            </div>
          </div>

          <div className="account-tab-row">
            {[
              { key: "details", label: "Details" },
              { key: "orders", label: "Orders" },
            ].map((tab) => (
              <button key={tab.key} type="button" className={`account-tab${activeTab === tab.key ? " active" : ""}`} onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "details" ? (
            <div className="account-panel-stack">
              <section className="account-card">
                <div className="account-card-head">
                  <h2>Profile</h2>
                  <button type="button" className="inline-text-button" onClick={logout}>Log out</button>
                </div>
                <div className="account-form-grid">
                  <label className="checkout-field">
                    <span>Full name</span>
                    <div className="checkout-field-input">
                      <UserRound />
                      <input value={profileDraft.name} onChange={(e) => setProfileDraft((c) => ({ ...c, name: e.target.value }))} />
                    </div>
                  </label>
                  <label className="checkout-field">
                    <span>Gender</span>
                    <div className="checkout-field-input">
                      <BadgeCheck />
                      <input value={profileDraft.gender} onChange={(e) => setProfileDraft((c) => ({ ...c, gender: e.target.value }))} placeholder="Female / Male / Other" />
                    </div>
                  </label>
                  <label className="checkout-field">
                    <span>Date of birth</span>
                    <div className="checkout-field-input">
                      <CalendarDays />
                      <input type="date" value={profileDraft.dob} onChange={(e) => setProfileDraft((c) => ({ ...c, dob: e.target.value }))} />
                    </div>
                  </label>
                </div>
                <button type="button" className="primary-cta full" onClick={saveProfileSummary}>Save profile</button>
              </section>

              <section className="account-card">
                <div className="account-card-head">
                  <h2>Saved addresses</h2>
                  <button type="button" className="inline-text-button" onClick={() => openAddressEditor(null)}>Add</button>
                </div>
                <div className="saved-addresses">
                  {(savedUser.addresses || []).map((address) => (
                    <button key={address.id} type="button" className="saved-address-card" onClick={() => openAddressEditor(address)}>
                      <strong>{address.label || "Address"}{address.isDefault ? " · Default" : ""}</strong>
                      <p>{joinAddressLines(address).join(" · ")}</p>
                    </button>
                  ))}
                </div>
                {editingAddressId !== null ? (
                  <div className="account-editor">
                    <div className="account-card-head">
                      <h2>{editingAddressId ? "Edit address" : "Add address"}</h2>
                      <button type="button" className="sheet-icon-button" onClick={closeAddressEditor} aria-label="Close">
                        <X />
                      </button>
                    </div>
                    <div className="account-form-grid">
                      <label className="checkout-field">
                        <span>Label</span>
                        <div className="checkout-field-input">
                          <MapPin />
                          <input value={addressDraft.label} onChange={(e) => setAddressDraft((c) => ({ ...c, label: e.target.value }))} placeholder="Home" />
                        </div>
                      </label>
                      <button type="button" className="secondary-cta full checkout-fetch-button" onClick={() => fillLocation("address")} disabled={geoLoading}>
                        <LocateFixed />
                        <span>{geoLoading ? "Fetching..." : "Fetch current location"}</span>
                      </button>
                      {["line", "city", "atoll", "postcode", "country"].map((field) => (
                        <label key={field} className="checkout-field">
                          <span>{field === "line" ? "Address line" : field === "city" ? "City / Island" : field === "atoll" ? "Atoll" : field === "postcode" ? "Postcode" : "Country"}</span>
                          <div className="checkout-field-input">
                            <MapPinned />
                            <input
                              value={addressDraft[field]}
                              onChange={(e) => setAddressDraft((c) => ({ ...c, [field]: e.target.value }))}
                              placeholder={field === "line" ? "House / street address" : ""}
                            />
                          </div>
                        </label>
                      ))}
                    </div>
                    <label className="check-row">
                      <input type="checkbox" checked={addressDraft.isDefault} onChange={(e) => setAddressDraft((c) => ({ ...c, isDefault: e.target.checked }))} />
                      <span>Make default address</span>
                    </label>
                    <button type="button" className="primary-cta full" onClick={saveAddress}>
                      <Save />
                      <span>Save address</span>
                    </button>
                  </div>
                ) : null}
              </section>

              <div className="account-action-row">
                <div className="account-action-card">
                  <div className="account-action-icon"><Package /></div>
                  <div className="account-action-copy"><strong>Orders</strong><p>{orders.length} order{orders.length === 1 ? "" : "s"}</p></div>
                </div>
                <div className="account-action-card">
                  <div className="account-action-icon"><CreditCard /></div>
                  <div className="account-action-copy"><strong>Payments</strong><p>Checkout methods</p></div>
                </div>
              </div>
              <section className="account-card">
                <div className="account-card-head">
                  <h2>Store policies</h2>
                </div>
                <div className="account-action-row">
                  <Link href="/privacy" className="account-action-card account-action-link">
                    <div className="account-action-icon"><ShieldCheck /></div>
                    <div className="account-action-copy"><strong>Privacy policy</strong><p>How we use your data</p></div>
                    <ChevronRight />
                  </Link>
                  <Link href="/returns" className="account-action-card account-action-link">
                    <div className="account-action-icon"><FileText /></div>
                    <div className="account-action-copy"><strong>Returns policy</strong><p>2 hours to 24 hours after delivery</p></div>
                    <ChevronRight />
                  </Link>
                </div>
              </section>
            </div>
          ) : (
            <div className="account-panel-stack">
              <section className="account-card">
                <div className="account-card-head">
                  <h2>Orders</h2>
                </div>
                {ordersLoading ? <p className="page-copy">Loading orders…</p> : null}
                {!ordersLoading && !orders.length ? <p className="page-copy">No orders yet.</p> : null}
                <div className="account-order-list">
                  {orders.map((order) => (
                    <article className="account-order-card" key={order.id}>
                      <div className="account-order-top">
                        <strong>{order.id}</strong>
                        <span>{order.status}</span>
                      </div>
                      {(order.items || []).slice(0, 1).map((item) => (
                        <div className="account-order-item" key={`${order.id}-${item.productId}`}>
                          <img src={item.image || ""} alt={item.name} width="52" height="60" />
                          <div>
                            <strong>{item.name}</strong>
                            <p>{item.size || ""} · Qty {item.qty}</p>
                          </div>
                        </div>
                      ))}
                      <div className="summary-line total">
                        <span>Total</span>
                        <strong>{formatPrice((order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0) + Number(order.shipping || 0))}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="account-hero">
            <div className="account-hero-avatar" aria-hidden="true">
              <UserRound />
            </div>
            <div className="account-hero-copy">
              <p className="placeholder-kicker">Kanxi Collection</p>
              <h1>Account</h1>
              <span>Sign in with OTP to access orders, profile and saved addresses.</span>
            </div>
          </div>

          <section className="account-card">
            <div className="account-card-head">
              <h2>Sign in</h2>
            </div>
            {otpState.step === "phone" ? (
              <div className="checkout-flow-card">
                <p className="page-copy">Use your 7-digit mobile number. We will send a one-time code.</p>
                <label className="checkout-field">
                  <span>Mobile number</span>
                  <div className="checkout-field-input checkout-phone-field">
                    <span>+960</span>
                    <input
                      value={otpState.phone}
                      onChange={(event) => setOtpState((current) => ({ ...current, phone: phoneDigits(event.target.value) }))}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="7771234"
                    />
                  </div>
                </label>
                <button type="button" className="primary-cta full" onClick={sendOtp} disabled={otpBusy}>
                  {otpBusy ? "Sending..." : "Send OTP"}
                </button>
              </div>
            ) : null}

            {otpState.step === "otp" ? (
              <div className="checkout-flow-card">
                <div className="checkout-sheet-inline">
                  <strong>+960 {otpState.phone}</strong>
                  <button type="button" className="inline-text-button" onClick={() => setOtpState((current) => ({ ...current, step: "phone" }))}>
                    Edit
                  </button>
                </div>
                <div className="checkout-otp-grid">
                  {otpCode.map((digit, index) => (
                    <input
                      key={index}
                      value={digit}
                      onChange={(event) => updateOtpDigit(index, event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Backspace" && !otpCode[index] && index > 0) {
                          const previous = document.getElementById(`account-otp-digit-${index - 1}`);
                          previous?.focus();
                        }
                      }}
                      onPaste={(event) => {
                        const pasted = String(event.clipboardData.getData("text") || "").replace(/\D/g, "");
                        if (!pasted) return;
                        event.preventDefault();
                        updateOtpDigit(index, pasted);
                      }}
                      id={`account-otp-digit-${index}`}
                      maxLength={index === 0 ? 6 : 1}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      name={index === 0 ? "one-time-code" : undefined}
                    />
                  ))}
                </div>
                <div className="checkout-sheet-footer">
                  <button type="button" className="secondary-cta" onClick={resendOtp} disabled={otpBusy}>
                    Resend
                  </button>
                  <button type="button" className="primary-cta" onClick={() => verifyOtp(false)} disabled={otpBusy}>
                    {otpBusy ? "Verifying..." : "Verify OTP"}
                  </button>
                </div>
              </div>
            ) : null}

            {otpState.step === "profile" ? (
              <div className="checkout-flow-card">
                <label className="checkout-field">
                  <span>Full name</span>
                  <div className="checkout-field-input">
                    <UserRound />
                    <input
                      value={otpState.profile.name}
                      onChange={(event) =>
                        setOtpState((current) => ({
                          ...current,
                          profile: { ...current.profile, name: event.target.value },
                        }))
                      }
                      placeholder="Your name"
                    />
                  </div>
                </label>
                <label className="checkout-field">
                  <span>Gender</span>
                  <div className="checkout-field-input">
                    <BadgeCheck />
                    <input
                      value={otpState.profile.gender}
                      onChange={(event) =>
                        setOtpState((current) => ({
                          ...current,
                          profile: { ...current.profile, gender: event.target.value },
                        }))
                      }
                      placeholder="Female / Male / Other"
                    />
                  </div>
                </label>
                <label className="checkout-field">
                  <span>Date of birth</span>
                  <div className="checkout-field-input">
                    <Map />
                    <input
                      type="date"
                      value={otpState.profile.dob}
                      onChange={(event) =>
                        setOtpState((current) => ({
                          ...current,
                          profile: { ...current.profile, dob: event.target.value },
                        }))
                      }
                    />
                  </div>
                </label>
                <button type="button" className="secondary-cta full checkout-fetch-button" onClick={() => fillLocation("profile")} disabled={geoLoading}>
                  <LocateFixed />
                  <span>{geoLoading ? "Fetching..." : "Fetch current location"}</span>
                </button>
                {["line", "city", "atoll", "postcode", "country"].map((field) => (
                  <label key={field} className="checkout-field">
                    <span>{field === "line" ? "Address line" : field === "city" ? "City / Island" : field === "atoll" ? "Atoll" : field === "postcode" ? "Postcode" : "Country"}</span>
                    <div className="checkout-field-input">
                      <MapPinned />
                      <input
                        value={otpState.profile[field]}
                        onChange={(event) =>
                          setOtpState((current) => ({
                            ...current,
                            profile: { ...current.profile, [field]: event.target.value },
                          }))
                        }
                        placeholder={field === "line" ? "House / street address" : ""}
                      />
                    </div>
                  </label>
                ))}
                <button type="button" className="primary-cta full" onClick={saveOtpProfile} disabled={otpBusy}>
                  {otpBusy ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            ) : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>
        </>
      )}
    </section>
  );
}
