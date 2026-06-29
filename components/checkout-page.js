"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";

function emptyAddress() {
  return {
    label: "Primary address",
    line: "",
    city: "",
    atoll: "",
    postcode: "",
    country: "Maldives",
    isDefault: true,
    deliveryType: "address",
    deliveryInfo: { boatName: "", contactNumber: "", departureTime: "", note: "" },
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
        { key: "address", label: "Address Delivery", rate: 0 },
        { key: "self_pickup", label: "Self Pickup", rate: 0 },
      ];

  const [selectedPayment, setSelectedPayment] = useState(availablePayments[0]?.key || "transfer");
  const [selectedDelivery, setSelectedDelivery] = useState(availableDelivery[0]?.key || "address");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [savedUser, setSavedUser] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressDraft, setAddressDraft] = useState(emptyAddress());
  const [saveProfile, setSaveProfile] = useState(true);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const deliveryRate = useMemo(() => {
    const method = availableDelivery.find((item) => item.key === selectedDelivery);
    return Number(method?.rate || 0);
  }, [availableDelivery, selectedDelivery]);

  const selectedSavedAddress =
    savedUser?.addresses?.find((address) => address.id === selectedAddressId) ||
    savedUser?.addresses?.find((address) => address.isDefault) ||
    null;

  useEffect(() => {
    const handler = window.setTimeout(async () => {
      if (phone.length !== 7) {
        setSavedUser(null);
        setSelectedAddressId("");
        return;
      }
      setLoadingProfile(true);
      try {
        const response = await fetch(`/api/profile?phone=${phone}`);
        const data = await response.json();
        const user = data?.user || null;
        setSavedUser(user);
        if (user) {
          setCustomerName((current) => current || user.name || "");
          const defaultAddress = user.addresses?.find((address) => address.isDefault) || user.addresses?.[0] || null;
          setSelectedAddressId(defaultAddress?.id || "");
          if (!addressDraft.line) {
            setAddressDraft(defaultAddress || emptyAddress());
          }
        }
      } catch {
        setSavedUser(null);
      } finally {
        setLoadingProfile(false);
      }
    }, 280);
    return () => window.clearTimeout(handler);
  }, [phone]);

  useEffect(() => {
    setAddressDraft((current) => ({
      ...current,
      deliveryType: selectedDelivery,
    }));
  }, [selectedDelivery]);

  const activeAddress =
    selectedDelivery === "self_pickup"
      ? {
          ...emptyAddress(),
          label: "Self Pickup",
          line: "Self pickup",
          deliveryType: "self_pickup",
        }
      : selectedSavedAddress || addressDraft;

  const total = subtotal + deliveryRate;
  const readyToPlace =
    items.length > 0 &&
    customerName.trim() &&
    phone.length === 7 &&
    (selectedDelivery === "self_pickup" || activeAddress.line.trim());

  async function handlePlaceOrder() {
    if (!readyToPlace || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const userPayload = {
        name: customerName.trim(),
        phone,
        addresses: selectedDelivery === "self_pickup" ? [] : [{ ...activeAddress, isDefault: true, deliveryType: selectedDelivery }],
      };
      const orderPayload = {
        userName: customerName.trim(),
        userPhone: `960${phone}`,
        payMethod: selectedPayment,
        shipping: deliveryRate,
        total,
        address:
          selectedDelivery === "self_pickup"
            ? "Self pickup"
            : [activeAddress.line, activeAddress.city, activeAddress.atoll, activeAddress.postcode, activeAddress.country]
                .filter(Boolean)
                .join(", "),
        addressMeta: selectedDelivery === "self_pickup" ? null : activeAddress,
        deliveryType: selectedDelivery,
        deliveryInfo: activeAddress.deliveryInfo || null,
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
          saveProfile,
          user: userPayload,
          order: orderPayload,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not place order");
      setPlacedOrder(data.order);
      clear();
    } catch (nextError) {
      setError(nextError.message || "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  if (placedOrder) {
    return (
      <section className="checkout-page">
        <div className="checkout-success">
          <p className="eyebrow">Order complete</p>
          <h1>{placedOrder.id}</h1>
          <p className="page-copy">
            Order saved to the main store data. Payment status: {placedOrder.payStatus}. Delivery type: {placedOrder.deliveryType}.
          </p>
          <button
            className="primary-cta"
            type="button"
            onClick={() => {
              setPlacedOrder(null);
            }}
          >
            Continue shopping
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="checkout-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Checkout</p>
          <h1>Review and place your order</h1>
        </div>
      </div>

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
                    <img src={item.image} alt={item.name} width="92" height="92" />
                    <div className="checkout-item-copy">
                      <strong>{item.name}</strong>
                      <p>{item.brand}</p>
                      <span>{item.variantLabel}</span>
                      <div className="qty-stepper next compact">
                        <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty - 1, item.stock)}>
                          −
                        </button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item.productId, item.variantId, item.qty + 1, item.stock)}>
                          +
                        </button>
                      </div>
                    </div>
                    <div className="checkout-item-side">
                      <strong>MVR {Math.round(item.price * item.qty)}</strong>
                      <button type="button" className="inline-text-button" onClick={() => removeItem(item.productId, item.variantId)}>
                        Remove
                      </button>
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
              <h2>Profile</h2>
              <span>{loadingProfile ? "Loading..." : savedUser ? "Saved profile found" : "Guest checkout"}</span>
            </div>
            <div className="field-stack">
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Full name" />
              <input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 7))} placeholder="Phone number" />
            </div>
            <label className="check-row">
              <input type="checkbox" checked={saveProfile} onChange={(event) => setSaveProfile(event.target.checked)} />
              <span>Save profile and address for next checkout</span>
            </label>
          </section>

          <section className="checkout-card">
            <div className="detail-section-head">
              <h2>Address</h2>
              <span>{selectedDelivery === "self_pickup" ? "Pickup" : "Delivery"}</span>
            </div>

            {selectedDelivery !== "self_pickup" && savedUser?.addresses?.length ? (
              <div className="saved-addresses">
                {savedUser.addresses.map((address) => (
                  <button
                    key={address.id}
                    type="button"
                    className={`saved-address-card${selectedAddressId === address.id ? " active" : ""}`}
                    onClick={() => setSelectedAddressId(address.id)}
                  >
                    <strong>{address.label}</strong>
                    <p>{[address.line, address.city, address.atoll].filter(Boolean).join(", ")}</p>
                  </button>
                ))}
                <button type="button" className={`saved-address-card${selectedAddressId ? "" : " active"}`} onClick={() => setSelectedAddressId("")}>
                  <strong>Use new address</strong>
                  <p>Enter another address for this order</p>
                </button>
              </div>
            ) : null}

            {selectedDelivery !== "self_pickup" && !selectedAddressId ? (
              <div className="field-stack">
                <input
                  value={addressDraft.label}
                  onChange={(event) => setAddressDraft((current) => ({ ...current, label: event.target.value }))}
                  placeholder="Address label"
                />
                <textarea
                  value={addressDraft.line}
                  onChange={(event) => setAddressDraft((current) => ({ ...current, line: event.target.value }))}
                  placeholder="Delivery address"
                  rows={3}
                />
                <div className="address-grid">
                  <input
                    value={addressDraft.city}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, city: event.target.value }))}
                    placeholder="City / Island"
                  />
                  <input
                    value={addressDraft.atoll}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, atoll: event.target.value }))}
                    placeholder="Atoll"
                  />
                </div>
                <div className="address-grid">
                  <input
                    value={addressDraft.postcode}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, postcode: event.target.value }))}
                    placeholder="Postcode"
                  />
                  <input
                    value={addressDraft.country}
                    onChange={(event) => setAddressDraft((current) => ({ ...current, country: event.target.value }))}
                    placeholder="Country"
                  />
                </div>
              </div>
            ) : null}
          </section>
        </div>

        <div className="checkout-column">
          <section className="checkout-card">
            <div className="detail-section-head">
              <h2>Delivery</h2>
            </div>
            <div className="option-stack">
              {availableDelivery.map((method) => (
                <button
                  key={method.key}
                  type="button"
                  className={`choice-card${selectedDelivery === method.key ? " active" : ""}`}
                  onClick={() => setSelectedDelivery(method.key)}
                >
                  <div>
                    <strong>{method.label}</strong>
                    <p>{Number(method.rate || 0) > 0 ? `MVR ${Math.round(method.rate)}` : "Free"}</p>
                  </div>
                  <span className="choice-dot" />
                </button>
              ))}
            </div>
          </section>

          <section className="checkout-card">
            <div className="detail-section-head">
              <h2>Payment</h2>
            </div>
            <div className="option-stack">
              {availablePayments.map((method) => (
                <button
                  key={method.key}
                  type="button"
                  className={`choice-card${selectedPayment === method.key ? " active" : ""}`}
                  onClick={() => setSelectedPayment(method.key)}
                >
                  <div>
                    <strong>{method.label}</strong>
                    <p>{method.key === "transfer" && bankTransfer?.accountNumber ? bankTransfer.accountNumber : "Available at checkout"}</p>
                  </div>
                  <span className="choice-dot" />
                </button>
              ))}
            </div>
          </section>

          <section className="checkout-card">
            <div className="detail-section-head">
              <h2>Summary</h2>
            </div>
            <div className="summary-line"><span>Subtotal</span><strong>MVR {Math.round(subtotal)}</strong></div>
            <div className="summary-line"><span>Shipping</span><strong>MVR {Math.round(deliveryRate)}</strong></div>
            <div className="summary-line total"><span>Total</span><strong>MVR {Math.round(total)}</strong></div>
            {error ? <p className="error-text">{error}</p> : null}
            <button type="button" className="primary-cta full" disabled={!readyToPlace || submitting} onClick={handlePlaceOrder}>
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </section>
        </div>
      </div>
    </section>
  );
}
