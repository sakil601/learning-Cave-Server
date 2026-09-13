const isLive = process.env.SSLCOMMERZ_IS_LIVE === "true";

const INIT_URL = isLive
  ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php"
  : "https://sandbox-gw.sslcommerz.com/gwprocess/v4/api.php";

const VALIDATION_URL = isLive
  ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php"
  : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";

export async function initiateSSLCommerzPayment({
  transactionId,
  amount,
  customer,
  productName,
}) {
  const body = new URLSearchParams({
    store_id: process.env.SSLCOMMERZ_STORE_ID,
    store_passwd: process.env.SSLCOMMERZ_STORE_PASSWORD,

    total_amount: String(amount),
    currency: "BDT",

    tran_id: transactionId,

    success_url: `${process.env.SERVER_URL}/api/v1/payments/sslcommerz/success`,
    fail_url: `${process.env.SERVER_URL}/api/v1/payments/sslcommerz/fail`,
    cancel_url: `${process.env.SERVER_URL}/api/v1/payments/sslcommerz/cancel`,
    ipn_url: `${process.env.SERVER_URL}/api/v1/payments/sslcommerz/ipn`,

    cus_name: customer.name || "Customer",
    cus_email: customer.email || "customer@example.com",
    cus_phone: customer.phone || "00000000000",

    cus_add1: "N/A",
    cus_city: "N/A",
    cus_country: "Bangladesh",

    shipping_method: "NO",
    product_name: productName || "Learning Cave Course",
    product_category: "Education",
    product_profile: "non-physical-goods",
  });

  const response = await fetch(INIT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error("Failed to connect to SSLCommerz.");
  }

  return response.json();
}

export async function validateSSLCommerzPayment(valId) {
  const url = new URL(VALIDATION_URL);

  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", process.env.SSLCOMMERZ_STORE_ID);
  url.searchParams.set("store_passwd", process.env.SSLCOMMERZ_STORE_PASSWORD);
  url.searchParams.set("format", "json");

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed to validate SSLCommerz payment.");
  }

  return response.json();
}
