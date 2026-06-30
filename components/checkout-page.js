"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Landmark,
  LocateFixed,
  MapPinned,
  PackageCheck,
  Phone,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { useCart } from "@/components/cart-provider";

const SESSION_KEY = "kanxi-next-user";

function emptyAddress() {
  return {
    id: "",
    label: "Primary address",
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

function emptyGuestDraft() {
  return {
    name: "",
    phone: "",
    line: "",
    city: "",
    atoll: "",
    postcode: "",
    country: "Maldives",
    lat: null,
    lng: null,
    deliveryType: "address",
    deliveryInfo: { boatName: "", contactNumber: "", departureTime: "", note: "" },
  };
}

function emptyLoginState() {
  return {
    step: "phone",
    phone: "",
    phoneDigits: "",
    requestId: null,
    profile: {
      name: "",
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

function phoneDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 7);
}

function phoneForApi(value) {
  const digits = phoneDigits(value);
  return digits.length === 7 ? `960${digits}` : digits;
}

function formatPrice(value) {
  return `MVR ${Math.round(Number(value || 0)).toLocaleString()}`;
}

function joinAddressLines(address) {
  if (!address) return [];
  return [
    address.line,
    [address.city, address.atoll].filter(Boolean).join(", "),
    [address.postcode, address.country].filter(Boolean).join(" · "),
  ].filter(Boolean);
}

function selectedSavedAddress(user, selectedAddressId) {
  return (
    user?.addresses?.find((address) => address.id === selectedAddressId) ||
    user?.addresses?.find((address) => address.isDefault) ||
    user?.addresses?.[0] ||
    null
  );
}

function deliveryDescription(method) {
  if (!method) return "";
  if (Number(method.rate || 0) > 0) return `${formatPrice(method.rate)} delivery rate`;
  return "No delivery charge";
}

function paymentIcon(methodKey) {
  if (methodKey === "transfer") return Landmark;
  if (methodKey === "cod") return PackageCheck;
  return CreditCard;
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

export function CheckoutPage({ paymentMethods = [], deliveryMethods = [], bankTransfer }) {
  const { items, subtotal, updateQty, removeItem, clear } = useCart();
  const availablePayments = paymentMethods.length
    ? paymentMethods
    : [
        { key: "transfer", label: "Bank Transfer" },
        { key: "cod", label: "Cash on Delivery" },
      ];
  const availableDelivery = deliveryMethods.length
    ? deliveryMethods
    : [
        { key: "address", label: "Address", rate: 0 },
        { key: "self_pickup", label: "Self Pickup", rate: 0 },
      ];

  const [selectedPayment, setSelectedPayment] = useState(availablePayments[0]?.key || "transfer");
  const [placedOrder, setPlacedOrder] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addressMode, setAddressMode] = useState("login");
  const [savedUser, setSavedUser] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [guestDraft, setGuestDraft] = useState(emptyGuestDraft());
  const [saveProfile, setSaveProfile] = useState(true);
  const [otpState, setOtpState] = useState(emptyLoginState());
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [otpBusy, setOtpBusy] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);

  const shippingMethod = useMemo(() => {
    const deliveryType =
      addressMode === "guest"
        ? guestDraft.deliveryType
        : selectedSavedAddress(savedUser, selectedAddressId)?.deliveryType || "address";
    return availableDelivery.find((method) => method.key === deliveryType) || availableDelivery[0] || null;
  }, [addressMode, availableDelivery, guestDraft.deliveryType, savedUser, selectedAddressId]);

  const activeAddress = useMemo(() => {
    if (addressMode === "guest") {
      return guestDraft.line.trim() || guestDraft.phone.trim() ? guestDraft : null;
    }
    return selectedSavedAddress(savedUser, selectedAddressId);
  }, [addressMode, guestDraft, savedUser, selectedAddressId]);

  const shippingRate = activeAddress ? Number(shippingMethod?.rate || 0) : 0;
  const total = subtotal + shippingRate;
  const isPickup = (activeAddress?.deliveryType || shippingMethod?.key) === "self_pickup";
  const addressReady = Boolean(
    activeAddress &&
      ((addressMode === "guest" &&
        guestDraft.name.trim() &&
        guestDraft.phone.trim().length === 7 &&
        (isPickup || guestDraft.line.trim())) ||
        (addressMode !== "guest" && (isPickup || activeAddress.line))),
  );
  const readyToPlace = items.length > 0 && addressReady;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY);
      const user = raw ? JSON.parse(raw) : null;
      if (!user?.phone) return;
      setSavedUser(user);
      setAddressMode(user.addresses?.length ? "saved" : "guest");
      setSelectedAddressId(user.addresses?.find((address) => address.isDefault)?.id || user.addresses?.[0]?.id || "");
    } catch {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  useEffect(() => {
    const code = otpCode.join("");
    if (otpState.step === "otp" && code.length === 6 && !otpBusy) {
      const timer = window.setTimeout(() => {
        verifyOtp(true);
      }, 120);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [otpBusy, otpCode, otpState.step]);

  useEffect(() => {
    if (!savedUser) {
      setAddressMode((current) => (current === "saved" ? "login" : current));
      return;
    }
    const selected = selectedSavedAddress(savedUser, selectedAddressId);
    if (!selected?.id && savedUser.addresses?.length) {
      setSelectedAddressId(savedUser.addresses[0].id);
    }
    if (addressMode === "login") {
      setAddressMode(savedUser.addresses?.length ? "saved" : "guest");
    }
  }, [addressMode, savedUser, selectedAddressId]);

  async function loadUserByPhone(phone, options = {}) {
    const lookup = phoneDigits(phone);
    if (lookup.length !== 7) return null;
    if (!options.silent) setLoadingUser(true);
    try {
      const response = await fetch(`/api/profile?phone=${phoneForApi(lookup)}`);
      const data = await response.json();
      return data?.user || null;
    } finally {
      if (!options.silent) setLoadingUser(false);
    }
  }

  function persistSession(user) {
    setSavedUser(user);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    setSelectedAddressId(user?.addresses?.find((address) => address.isDefault)?.id || user?.addresses?.[0]?.id || "");
  }

  function logoutSession() {
    setSavedUser(null);
    setSelectedAddressId("");
    setAddressMode("login");
    window.localStorage.removeItem(SESSION_KEY);
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
        setAddressMode(existingUser.addresses?.length ? "saved" : "guest");
        setSheetOpen(false);
      } else {
        setOtpState((current) => ({
          ...current,
          step: "profile",
          profile: {
            ...current.profile,
            name: current.profile.name || "",
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

  async function fillAddress(target) {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return;
    }
    setAddressLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const lookup = await reverseLookup(lat, lng);
          if (target === "guest") {
            setGuestDraft((current) => ({ ...current, ...lookup, lat, lng }));
          } else {
            setOtpState((current) => ({
              ...current,
              profile: { ...current.profile, ...lookup, lat, lng },
            }));
          }
        } catch {
          if (target === "guest") {
            setGuestDraft((current) => ({ ...current, lat, lng, line: current.line || `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
          } else {
            setOtpState((current) => ({
              ...current,
              profile: { ...current.profile, lat, lng, line: current.profile.line || `Near ${lat.toFixed(4)}, ${lng.toFixed(4)}` },
            }));
          }
        } finally {
          setAddressLoading(false);
        }
      },
      () => {
        setAddressLoading(false);
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
      setAddressMode("saved");
      setSheetOpen(false);
      setOtpState(emptyLoginState());
    } catch (nextError) {
      setError(nextError.message || "Could not save profile");
    } finally {
      setOtpBusy(false);
    }
  }

  async function handlePlaceOrder() {
    if (!addressReady) {
      setSheetOpen(true);
      return;
    }
    if (submitting || !items.length) return;
    setSubmitting(true);
    setError("");
    try {
      const address = activeAddress;
      const userPayload = saveProfile
        ? {
            name: addressMode === "guest" ? guestDraft.name.trim() : savedUser?.name || "Kanxi Customer",
            phone: addressMode === "guest" ? phoneForApi(guestDraft.phone) : savedUser?.phone || "",
            addresses:
              addressMode === "guest"
                ? [
                    {
                      ...address,
                      isDefault: true,
                      deliveryType: address.deliveryType || "address",
                    },
                  ]
                : savedUser?.addresses || [],
          }
        : null;

      const orderPayload = {
        userName: addressMode === "guest" ? guestDraft.name.trim() : savedUser?.name || "Kanxi Customer",
        userPhone: addressMode === "guest" ? phoneForApi(guestDraft.phone) : savedUser?.phone || "",
        payMethod: selectedPayment,
        shipping: shippingRate,
        total,
        address: isPickup ? "Self pickup" : joinAddressLines(address).join(", "),
        addressMeta: address,
        deliveryType: address?.deliveryType || shippingMethod?.key || "address",
        deliveryInfo: address?.deliveryInfo || null,
        items: items.map((item) => ({
          productId: item.productId,
          variantId: item.variantId || null,
          name: item.name,
          qty: item.qty,
          price: item.price,
          image: item.image,
          size: item.variantLabel,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveProfile: Boolean(userPayload),
          user: userPayload,
          order: orderPayload,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not place order");

      if (userPayload && data?.order && addressMode === "guest") {
        const freshUser = await loadUserByPhone(guestDraft.phone, { silent: true });
        if (freshUser) persistSession(freshUser);
      }

      setPlacedOrder(data.order);
      clear();
    } catch (nextError) {
      setError(nextError.message || "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  function updateOtpDigit(index, value) {
    const digits = String(value || "").replace(/\D/g, "");
    if (digits.length > 1) {
      const next = ["", "", "", "", "", ""];
      digits
        .slice(0, 6)
        .split("")
        .forEach((digit, digitIndex) => {
          next[digitIndex] = digit;
        });
      setOtpCode(next);
      return;
    }
    setOtpCode((current) => current.map((entry, entryIndex) => (entryIndex === index ? digits : entry)));
  }

  function renderModeTabs() {
    const tabs = [];
    if (!savedUser) tabs.push({ key: "login", label: "Login" });
    if (savedUser?.addresses?.length) tabs.push({ key: "saved", label: "Saved" });
    tabs.push({ key: "guest", label: "Guest Checkout" });
    return tabs;
  }

  if (placedOrder) {
    return (
      <section className="checkout-page">
        <div className="checkout-success">
          <p className="eyebrow">Order complete</p>
          <h1>{placedOrder.id}</h1>
          <p className="page-copy">
            Payment status: {placedOrder.payStatus}. Delivery type: {placedOrder.deliveryType}.
          </p>
          <button className="primary-cta full" type="button" onClick={() => setPlacedOrder(null)}>
            Continue shopping
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="checkout-page">
        <div className="page-title-row">
          <div>
            <p className="eyebrow">Checkout</p>
            <h1>Review and place your order</h1>
          </div>
        </div>

        <section className="checkout-card checkout-address-card" role="button" tabIndex={0} onClick={() => setSheetOpen(true)}>
          <div className="checkout-address-copy">
            <strong>{addressMode === "guest" ? guestDraft.name || "Guest Checkout" : savedUser?.name || "Select address"}</strong>
            {addressReady ? (
              joinAddressLines(activeAddress).map((line) => (
                <p key={line}>{line}</p>
              ))
            ) : (
              <p>{savedUser ? "Select a saved address or add a guest address" : "Login with OTP or continue as guest"}</p>
            )}
          </div>
          <span className="checkout-address-arrow">›</span>
        </section>

        <div className="checkout-layout">
          <div className="checkout-column">
            <section className="checkout-card">
              <div className="detail-section-head">
                <h2>Items</h2>
                <span>{items.length} in bag</span>
              </div>
              {items.length ? (
                <div className="checkout-items">
                  {items.map((item) => (
                    <article className="checkout-item" key={`${item.productId}-${item.variantId || "default"}`}>
                      <img src={item.primaryImage || item.image} alt={item.name} width="92" height="92" />
                      <div className="checkout-item-copy">
                        <div className="checkout-item-topline">
                          <strong>{item.name}</strong>
                          <div className="checkout-item-meta">
                            {item.brand ? <p>{item.brand}</p> : null}
                            {item.variantLabel ? <span>{item.variantLabel}</span> : null}
                          </div>
                        </div>
                        <div className="checkout-item-foot">
                          <div className="qty-stepper next compact">
                            <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty - 1, item.stock)}>
                              −
                            </button>
                            <span>{item.qty}</span>
                            <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty + 1, item.stock)}>
                              +
                            </button>
                          </div>
                          <div className="checkout-item-side">
                            <strong>{formatPrice(item.price * item.qty)}</strong>
                            <button type="button" className="inline-text-button" onClick={() => removeItem(item.productId, item.variantId)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="page-copy">Your bag is empty.</p>
              )}
            </section>

            <section className="checkout-card">
              <div className="detail-section-head">
                <h2>Payment</h2>
                <span>{selectedPayment === "transfer" ? "Bank transfer" : "Checkout"}</span>
              </div>
              <div className="option-stack">
                {availablePayments.map((method) => {
                  const Icon = paymentIcon(method.key);
                  const isActive = selectedPayment === method.key;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      className={`choice-card${isActive ? " active" : ""}`}
                      onClick={() => setSelectedPayment(method.key)}
                    >
                      <div className="choice-main">
                        <span className="choice-icon">
                          <Icon />
                        </span>
                        <div>
                          <strong>{method.label}</strong>
                          <p>{method.key === "transfer" && bankTransfer?.accountNumber ? bankTransfer.accountNumber : "Available at checkout"}</p>
                        </div>
                      </div>
                      <span className="choice-dot" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="checkout-column">
            <section className="checkout-card">
              <div className="detail-section-head">
                <h2>Summary</h2>
                <span>{addressReady ? shippingMethod?.label || "Delivery" : "Address required"}</span>
              </div>
              <div className="summary-line">
                <span>Subtotal</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div className="summary-line">
                <span>Shipping</span>
                <strong>{formatPrice(shippingRate)}</strong>
              </div>
              <div className="summary-line total">
                <span>Total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
            </section>

            <div className="checkout-bar checkout-bar--inline">
              <div className="checkout-bar-total">
                <span>Order total</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <button
                className="primary-cta full"
                type="button"
                disabled={!items.length || submitting}
                onClick={addressReady ? handlePlaceOrder : () => setSheetOpen(true)}
              >
                {addressReady ? (submitting ? "Placing order..." : "Place Order") : "Select Address"}
              </button>
            </div>

            {error ? <p className="error-text">{error}</p> : null}
          </div>
        </div>
      </section>

      <div className={`checkout-sheet-backdrop${sheetOpen ? " show" : ""}`} onClick={() => setSheetOpen(false)} />
      <div className={`checkout-sheet${sheetOpen ? " show" : ""}`}>
        <div className="checkout-sheet-grabber" />
        <div className="checkout-sheet-head">
          <div>
            <h2>Select Address</h2>
            <p>Login with OTP or use guest checkout.</p>
          </div>
          <button type="button" className="sheet-icon-button" onClick={() => setSheetOpen(false)} aria-label="Close">
            <X />
          </button>
        </div>

        <div className="checkout-mode-row">
          {renderModeTabs().map((tab) => (
            <button key={tab.key} type="button" className={`checkout-mode${addressMode === tab.key ? " active" : ""}`} onClick={() => setAddressMode(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {addressMode === "saved" ? (
          <div className="saved-addresses">
            {savedUser?.addresses?.map((address) => (
              <button
                key={address.id}
                type="button"
                className={`saved-address-card${selectedAddressId === address.id ? " active" : ""}`}
                onClick={() => {
                  setSelectedAddressId(address.id);
                }}
              >
                <strong>{address.label || "Address"}</strong>
                <p>{joinAddressLines(address).join(" · ")}</p>
              </button>
            ))}
            <div className="checkout-sheet-footer">
              <button type="button" className="primary-cta" onClick={() => setSheetOpen(false)} disabled={!selectedAddressId}>
                Use Address
              </button>
              <button type="button" className="secondary-cta" onClick={logoutSession}>
                Log out
              </button>
            </div>
          </div>
        ) : null}

        {addressMode === "login" ? (
          <div className="checkout-flow-card">
            {otpState.step === "phone" ? (
              <>
                <p className="page-copy">Use your 7-digit mobile number. OTP verification will unlock your saved addresses.</p>
                <label className="checkout-field">
                  <span>Phone number</span>
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
              </>
            ) : null}

            {otpState.step === "otp" ? (
              <>
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
                          const previous = document.getElementById(`otp-digit-${index - 1}`);
                          previous?.focus();
                        }
                      }}
                      onPaste={(event) => {
                        const pasted = String(event.clipboardData.getData("text") || "").replace(/\D/g, "");
                        if (!pasted) return;
                        event.preventDefault();
                        updateOtpDigit(index, pasted);
                      }}
                      id={`otp-digit-${index}`}
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
              </>
            ) : null}

            {otpState.step === "profile" ? (
              <>
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
                <button type="button" className="secondary-cta full checkout-fetch-button" onClick={() => fillAddress("profile")} disabled={addressLoading}>
                  <LocateFixed />
                  <span>{addressLoading ? "Fetching..." : "Fetch Address"}</span>
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
                  {otpBusy ? "Saving..." : "Continue"}
                </button>
              </>
            ) : null}
          </div>
        ) : null}

        {addressMode === "guest" ? (
          <div className="checkout-flow-card">
            <label className="checkout-field">
              <span>Full name</span>
              <div className="checkout-field-input">
                <UserRound />
                <input
                  value={guestDraft.name}
                  onChange={(event) => setGuestDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
            </label>
            <label className="checkout-field">
              <span>Phone number</span>
              <div className="checkout-field-input checkout-phone-field">
                <Phone />
                <input
                  value={guestDraft.phone}
                  onChange={(event) => setGuestDraft((current) => ({ ...current, phone: phoneDigits(event.target.value) }))}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="7771234"
                />
              </div>
            </label>

            <div className="checkout-choice-list">
              {availableDelivery.map((method) => (
                <button
                  key={method.key}
                  type="button"
                  className={`choice-card${guestDraft.deliveryType === method.key ? " active" : ""}`}
                  onClick={() => setGuestDraft((current) => ({ ...current, deliveryType: method.key }))}
                >
                  <div className="choice-main">
                    <span className="choice-icon">
                      {method.key === "self_pickup" ? <Store /> : <MapPinned />}
                    </span>
                    <div>
                      <strong>{method.label}</strong>
                      <p>{deliveryDescription(method)}</p>
                    </div>
                  </div>
                  <span className="choice-dot" />
                </button>
              ))}
            </div>

            <button type="button" className="secondary-cta full checkout-fetch-button" onClick={() => fillAddress("guest")} disabled={addressLoading}>
              <LocateFixed />
              <span>{addressLoading ? "Fetching..." : "Fetch Address"}</span>
            </button>

            {["line", "city", "atoll", "postcode", "country"].map((field) => (
              <label key={field} className="checkout-field">
                <span>{field === "line" ? "Address line" : field === "city" ? "City / Island" : field === "atoll" ? "Atoll" : field === "postcode" ? "Postcode" : "Country"}</span>
                <div className="checkout-field-input">
                  <MapPinned />
                  <input
                    value={guestDraft[field]}
                    onChange={(event) => setGuestDraft((current) => ({ ...current, [field]: event.target.value }))}
                    placeholder={field === "line" ? "House / street address" : ""}
                  />
                </div>
              </label>
            ))}

            <div className="checkout-sheet-footer">
              <button type="button" className="secondary-cta" onClick={() => setSheetOpen(false)}>
                Cancel
              </button>
              <button type="button" className="primary-cta" onClick={() => setSheetOpen(false)}>
                Use Address
              </button>
            </div>

            <label className="check-row">
              <input type="checkbox" checked={saveProfile} onChange={(event) => setSaveProfile(event.target.checked)} />
              <span>Save this profile for next checkout</span>
            </label>
          </div>
        ) : null}

        {loadingUser ? <p className="page-copy">Loading profile...</p> : null}
      </div>
    </>
  );
}
