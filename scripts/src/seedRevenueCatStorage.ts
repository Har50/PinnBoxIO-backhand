import { getUncachableRevenueCatClient } from "./revenueCatClient";
import {
  listApps,
  listProducts,
  createProduct,
  listEntitlements,
  createEntitlement,
  attachProductsToEntitlement,
  listOfferings,
  createOffering,
  updateOffering,
  listPackages,
  createPackages,
  attachProductsToPackage,
  type App,
  type CreateProductData,
  type Entitlement,
  type Offering,
  type Package,
  type Product,
} from "@replit/revenuecat-sdk";

const PROJECT_ID = process.env.REVENUECAT_PROJECT_ID;
const TEST_STORE_APP_ID = process.env.REVENUECAT_TEST_STORE_APP_ID;
const APP_STORE_APP_ID = process.env.REVENUECAT_APPLE_APP_STORE_APP_ID;
const PLAY_STORE_APP_ID = process.env.REVENUECAT_GOOGLE_PLAY_STORE_APP_ID;

const STORAGE_PLANS = [
  { gb: 10, usdMicros: 2_990_000, eurMicros: 2_990_000 },
  { gb: 50, usdMicros: 6_990_000, eurMicros: 6_990_000 },
  { gb: 100, usdMicros: 9_990_000, eurMicros: 9_990_000 },
];

type TestStorePricesResponse = {
  object: string;
  prices: { amount_micros: number; currency: string }[];
};

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function productIdentifier(gb: number) {
  return `pinnboxio_storage_${gb}gb_monthly`;
}

function playStoreProductIdentifier(gb: number) {
  return `${productIdentifier(gb)}:monthly`;
}

function packageIdentifier(gb: number) {
  return `storage_${gb}gb_monthly`;
}

function entitlementIdentifier(gb: number) {
  return `storage_${gb}gb`;
}

async function seedRevenueCatStorage() {
  const projectId = requireEnv(PROJECT_ID, "REVENUECAT_PROJECT_ID");
  const client = await getUncachableRevenueCatClient();

  const { data: apps, error: appsError } = await listApps({
    client,
    path: { project_id: projectId },
    query: { limit: 20 },
  });
  if (appsError || !apps) throw new Error("Failed to list RevenueCat apps");

  const testStoreApp = apps.items.find((app) => app.id === TEST_STORE_APP_ID);
  const appStoreApp = apps.items.find((app) => app.id === APP_STORE_APP_ID);
  const playStoreApp = apps.items.find((app) => app.id === PLAY_STORE_APP_ID);
  if (!testStoreApp || !appStoreApp || !playStoreApp) {
    throw new Error("RevenueCat app IDs are not configured correctly");
  }

  const { data: existingProducts, error: productsError } = await listProducts({
    client,
    path: { project_id: projectId },
    query: { limit: 100 },
  });
  if (productsError || !existingProducts) throw new Error("Failed to list RevenueCat products");

  const ensureProductForApp = async (
    app: App,
    storeIdentifier: string,
    displayName: string,
    title: string,
    isTestStore: boolean,
  ): Promise<Product> => {
    const existing = existingProducts.items.find((product) => product.app_id === app.id && product.store_identifier === storeIdentifier);
    if (existing) {
      console.log(`Product exists: ${displayName}`);
      return existing;
    }

    const body: CreateProductData["body"] = {
      app_id: app.id,
      store_identifier: storeIdentifier,
      type: "subscription",
      display_name: displayName,
    };

    if (isTestStore) {
      body.subscription = { duration: "P1M" };
      body.title = title;
    }

    const { data: created, error } = await createProduct({
      client,
      path: { project_id: projectId },
      body,
    });
    if (error || !created) throw new Error(`Failed to create product: ${displayName}`);
    console.log(`Created product: ${displayName}`);
    return created;
  };

  const { data: existingEntitlements, error: entitlementsError } = await listEntitlements({
    client,
    path: { project_id: projectId },
    query: { limit: 100 },
  });
  if (entitlementsError || !existingEntitlements) throw new Error("Failed to list entitlements");

  const ensureEntitlement = async (gb: number): Promise<Entitlement> => {
    const lookupKey = entitlementIdentifier(gb);
    const existing = existingEntitlements.items.find((entitlement) => entitlement.lookup_key === lookupKey);
    if (existing) {
      console.log(`Entitlement exists: ${lookupKey}`);
      return existing;
    }

    const { data: created, error } = await createEntitlement({
      client,
      path: { project_id: projectId },
      body: {
        lookup_key: lookupKey,
        display_name: `${gb} GB Storage`,
      },
    });
    if (error || !created) throw new Error(`Failed to create entitlement: ${lookupKey}`);
    console.log(`Created entitlement: ${lookupKey}`);
    return created;
  };

  const { data: existingOfferings, error: offeringsError } = await listOfferings({
    client,
    path: { project_id: projectId },
    query: { limit: 20 },
  });
  if (offeringsError || !existingOfferings) throw new Error("Failed to list offerings");

  let offering: Offering | undefined = existingOfferings.items.find((item) => item.lookup_key === "default");
  if (!offering) {
    const { data: created, error } = await createOffering({
      client,
      path: { project_id: projectId },
      body: { lookup_key: "default", display_name: "Default Offering" },
    });
    if (error || !created) throw new Error("Failed to create default offering");
    offering = created;
    console.log("Created default offering");
  }

  if (!offering.is_current) {
    const { error } = await updateOffering({
      client,
      path: { project_id: projectId, offering_id: offering.id },
      body: { is_current: true },
    });
    if (error) throw new Error("Failed to set default offering as current");
    console.log("Set default offering as current");
  }

  const { data: existingPackages, error: packagesError } = await listPackages({
    client,
    path: { project_id: projectId, offering_id: offering.id },
    query: { limit: 100 },
  });
  if (packagesError || !existingPackages) throw new Error("Failed to list packages");

  const ensurePackage = async (gb: number): Promise<Package> => {
    const lookupKey = packageIdentifier(gb);
    const existing = existingPackages.items.find((pkg) => pkg.lookup_key === lookupKey);
    if (existing) {
      console.log(`Package exists: ${lookupKey}`);
      return existing;
    }

    const { data: created, error } = await createPackages({
      client,
      path: { project_id: projectId, offering_id: offering.id },
      body: {
        lookup_key: lookupKey,
        display_name: `${gb} GB Storage Monthly`,
      },
    });
    if (error || !created) throw new Error(`Failed to create package: ${lookupKey}`);
    console.log(`Created package: ${lookupKey}`);
    return created;
  };

  for (const plan of STORAGE_PLANS) {
    const displayName = `PinnboxIO Storage ${plan.gb} GB Monthly`;
    const title = `${plan.gb} GB Cloud Storage`;
    const testProduct = await ensureProductForApp(testStoreApp, productIdentifier(plan.gb), displayName, title, true);
    const appStoreProduct = await ensureProductForApp(appStoreApp, productIdentifier(plan.gb), `${displayName} iOS`, title, false);
    const playStoreProduct = await ensureProductForApp(playStoreApp, playStoreProductIdentifier(plan.gb), `${displayName} Android`, title, false);

    const { error: priceError } = await client.post<TestStorePricesResponse>({
      url: "/projects/{project_id}/products/{product_id}/test_store_prices",
      path: { project_id: projectId, product_id: testProduct.id },
      body: {
        prices: [
          { amount_micros: plan.usdMicros, currency: "USD" },
          { amount_micros: plan.eurMicros, currency: "EUR" },
        ],
      },
    });
    if (priceError && !(typeof priceError === "object" && "type" in priceError && priceError.type === "resource_already_exists")) {
      throw new Error(`Failed to add test store price for ${plan.gb} GB`);
    }

    const entitlement = await ensureEntitlement(plan.gb);
    const { error: attachEntitlementError } = await attachProductsToEntitlement({
      client,
      path: { project_id: projectId, entitlement_id: entitlement.id },
      body: { product_ids: [testProduct.id, appStoreProduct.id, playStoreProduct.id] },
    });
    if (attachEntitlementError && attachEntitlementError.type !== "unprocessable_entity_error") {
      throw new Error(`Failed to attach products to entitlement for ${plan.gb} GB`);
    }

    const pkg = await ensurePackage(plan.gb);
    const { error: attachPackageError } = await attachProductsToPackage({
      client,
      path: { project_id: projectId, package_id: pkg.id },
      body: {
        products: [
          { product_id: testProduct.id, eligibility_criteria: "all" },
          { product_id: appStoreProduct.id, eligibility_criteria: "all" },
          { product_id: playStoreProduct.id, eligibility_criteria: "all" },
        ],
      },
    });
    if (attachPackageError && attachPackageError.type !== "unprocessable_entity_error") {
      throw new Error(`Failed to attach products to package for ${plan.gb} GB`);
    }
  }

  console.log("RevenueCat storage packages are ready.");
}

seedRevenueCatStorage().catch((error) => {
  console.error(error);
  process.exit(1);
});