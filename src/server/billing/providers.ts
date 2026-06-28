import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "crypto";
import {
  InstallmentGatewayProvider,
  PaymentGatewayProvider,
  PaymentMethodKind,
} from "@prisma/client";
import { getAppUrl } from "@/server/app-url";

type PaymentWebhookEventType =
  | "payment.succeeded"
  | "payment.failed"
  | "refund.succeeded";

type InstallmentWebhookEventType =
  | "installment.approved"
  | "installment.declined";

export type PaymentProviderCreateInput = {
  orderId: string;
  paymentId: string;
  amountMinor: number;
  currency: string;
  method: PaymentMethodKind;
  courseTitle: string;
  buyerEmail?: string | null;
  buyerName?: string | null;
  successUrl: string;
  cancelUrl: string;
};

export type InstallmentProviderCreateInput = {
  orderId: string;
  installmentPlanId: string;
  amountMinor: number;
  currency: string;
  courseTitle: string;
  buyerEmail?: string | null;
  buyerName?: string | null;
  successUrl: string;
  cancelUrl: string;
};

export type PaymentProviderCreateResult = {
  providerPaymentId: string;
  providerSessionId?: string | null;
  confirmationUrl: string;
  initialStatus: "PENDING" | "REQUIRES_ACTION";
  metadata?: Record<string, unknown>;
};

export type InstallmentProviderCreateResult = {
  providerPlanId: string;
  redirectUrl: string;
  initialStatus: "PENDING";
  metadata?: Record<string, unknown>;
};

export type PaymentWebhookPayload = {
  id: string;
  type: PaymentWebhookEventType;
  data: {
    providerPaymentId: string;
    amountMinor?: number;
    currency?: string;
    providerRefundId?: string | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  };
};

export type InstallmentWebhookPayload = {
  id: string;
  type: InstallmentWebhookEventType;
  data: {
    providerPlanId: string;
    amountMinor?: number;
    currency?: string;
    reason?: string | null;
    metadata?: Record<string, unknown>;
  };
};

export type ParsedPaymentWebhook = {
  externalEventId: string;
  type: PaymentWebhookEventType;
  providerPaymentId: string;
  amountMinor?: number;
  currency?: string;
  providerRefundId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export type ParsedInstallmentWebhook = {
  externalEventId: string;
  type: InstallmentWebhookEventType;
  providerPlanId: string;
  amountMinor?: number;
  currency?: string;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly key: PaymentGatewayProvider;
  createPayment(input: PaymentProviderCreateInput): Promise<PaymentProviderCreateResult>;
  verifyAndParseWebhook(input: {
    rawBody: string;
    signatureHeader: string | null;
  }): Promise<ParsedPaymentWebhook>;
  createRefund(input: {
    paymentId: string;
    providerPaymentId: string;
    refundId: string;
    amountMinor: number;
    currency: string;
    reason?: string | null;
  }): Promise<{
    providerRefundId: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface InstallmentProvider {
  readonly key: InstallmentGatewayProvider;
  createPlan(
    input: InstallmentProviderCreateInput,
  ): Promise<InstallmentProviderCreateResult>;
  verifyAndParseWebhook(input: {
    rawBody: string;
    signatureHeader: string | null;
  }): Promise<ParsedInstallmentWebhook>;
}

function getMockWebhookSecret() {
  return process.env.MOCK_PROVIDER_WEBHOOK_SECRET?.trim() || "nowa-school-mock-secret";
}

function buildMockSignature(rawBody: string) {
  const timestamp = String(Date.now());
  const payload = `${timestamp}.${rawBody}`;
  const digest = createHmac("sha256", getMockWebhookSecret())
    .update(payload)
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

function parseMockSignature(header: string | null) {
  if (!header) {
    throw new Error("Missing mock signature header.");
  }

  const parts = header.split(",").reduce<Record<string, string>>((acc, part) => {
    const [key, value] = part.split("=");

    if (key && value) {
      acc[key.trim()] = value.trim();
    }

    return acc;
  }, {});
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    throw new Error("Malformed mock signature header.");
  }

  return { timestamp, signature };
}

function verifyMockSignature(rawBody: string, header: string | null) {
  const { timestamp, signature } = parseMockSignature(header);
  const payload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", getMockWebhookSecret())
    .update(payload)
    .digest("hex");

  const left = Buffer.from(signature);
  const right = Buffer.from(expected);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new Error("Mock signature verification failed.");
  }
}

export function createSignedMockPaymentPayload(
  payload: Omit<PaymentWebhookPayload, "id"> & { id?: string },
) {
  const body = JSON.stringify({
    id: payload.id ?? randomUUID(),
    type: payload.type,
    data: payload.data,
  });

  return {
    rawBody: body,
    signature: buildMockSignature(body),
  };
}

export function createSignedMockInstallmentPayload(
  payload: Omit<InstallmentWebhookPayload, "id"> & { id?: string },
) {
  const body = JSON.stringify({
    id: payload.id ?? randomUUID(),
    type: payload.type,
    data: payload.data,
  });

  return {
    rawBody: body,
    signature: buildMockSignature(body),
  };
}

const mockPaymentProvider: PaymentProvider = {
  key: PaymentGatewayProvider.MOCK,
  async createPayment(input) {
    return {
      providerPaymentId: `mockpay_${input.paymentId}`,
      providerSessionId: `mocksession_${input.orderId}`,
      confirmationUrl: `${getAppUrl()}/checkout/provider/mock/payment/${encodeURIComponent(
        input.paymentId,
      )}`,
      initialStatus: "REQUIRES_ACTION",
      metadata: {
        method: input.method,
      },
    };
  },
  async verifyAndParseWebhook(input) {
    verifyMockSignature(input.rawBody, input.signatureHeader);
    const payload = JSON.parse(input.rawBody) as PaymentWebhookPayload;

    return {
      externalEventId: payload.id,
      type: payload.type,
      providerPaymentId: payload.data.providerPaymentId,
      amountMinor: payload.data.amountMinor,
      currency: payload.data.currency,
      providerRefundId: payload.data.providerRefundId ?? null,
      reason: payload.data.reason ?? null,
      metadata: payload.data.metadata,
    };
  },
  async createRefund(input) {
    return {
      providerRefundId: `mockrefund_${input.refundId}`,
      metadata: {
        providerPaymentId: input.providerPaymentId,
        amountMinor: input.amountMinor,
      },
    };
  },
};

const mockInstallmentProvider: InstallmentProvider = {
  key: InstallmentGatewayProvider.MOCK,
  async createPlan(input) {
    return {
      providerPlanId: `mockplan_${input.installmentPlanId}`,
      redirectUrl: `${getAppUrl()}/checkout/provider/mock/installment/${encodeURIComponent(
        input.installmentPlanId,
      )}`,
      initialStatus: "PENDING",
      metadata: {
        orderId: input.orderId,
      },
    };
  },
  async verifyAndParseWebhook(input) {
    verifyMockSignature(input.rawBody, input.signatureHeader);
    const payload = JSON.parse(input.rawBody) as InstallmentWebhookPayload;

    return {
      externalEventId: payload.id,
      type: payload.type,
      providerPlanId: payload.data.providerPlanId,
      amountMinor: payload.data.amountMinor,
      currency: payload.data.currency,
      reason: payload.data.reason ?? null,
      metadata: payload.data.metadata,
    };
  },
};

const stripePaymentProvider: PaymentProvider = {
  key: PaymentGatewayProvider.STRIPE,
  async createPayment() {
    throw new Error(
      "Stripe payment provider is scaffolded in the provider layer, but the live adapter is not configured in this workspace yet.",
    );
  },
  async verifyAndParseWebhook() {
    throw new Error(
      "Stripe webhook verification is not configured in this workspace yet.",
    );
  },
  async createRefund() {
    throw new Error("Stripe refunds are not configured in this workspace yet.");
  },
};

const tbankInstallmentProvider: InstallmentProvider = {
  key: InstallmentGatewayProvider.TINKOFF,
  async createPlan() {
    throw new Error(
      "T-Bank installment provider is scaffolded in the provider layer, but the live adapter is not configured in this workspace yet.",
    );
  },
  async verifyAndParseWebhook() {
    throw new Error(
      "T-Bank installment webhook verification is not configured in this workspace yet.",
    );
  },
};

export function getConfiguredPaymentProviderKey() {
  return (process.env.PAYMENT_PROVIDER?.trim().toUpperCase() ?? "MOCK") === "STRIPE"
    ? PaymentGatewayProvider.STRIPE
    : PaymentGatewayProvider.MOCK;
}

export function getConfiguredInstallmentProviderKey() {
  return (process.env.INSTALLMENT_PROVIDER?.trim().toUpperCase() ?? "MOCK") ===
    "TINKOFF"
    ? InstallmentGatewayProvider.TINKOFF
    : InstallmentGatewayProvider.MOCK;
}

export function getPaymentProvider(key: PaymentGatewayProvider) {
  switch (key) {
    case PaymentGatewayProvider.STRIPE:
      return stripePaymentProvider;
    case PaymentGatewayProvider.MOCK:
    default:
      return mockPaymentProvider;
  }
}

export function getInstallmentProvider(key: InstallmentGatewayProvider) {
  switch (key) {
    case InstallmentGatewayProvider.TINKOFF:
      return tbankInstallmentProvider;
    case InstallmentGatewayProvider.MOCK:
    default:
      return mockInstallmentProvider;
  }
}
