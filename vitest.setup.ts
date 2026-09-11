import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// With globals: false, @testing-library/react does not install its automatic
// cleanup. Without registering it here, DOM rendered by one test survives into
// the next and surfaces as getByRole failing with "found multiple elements".
afterEach(cleanup);
