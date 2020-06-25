/* eslint-disable react/prop-types, react/display-name */

import React, { useState, useEffect } from "react";
import "@testing-library/jest-dom";
import { render, act } from "@testing-library/react";
import { providers } from "@data-provider/core";
import sinon from "sinon";

import { usePolling, useData } from "../src";

import MockProvider from "./MockProvider";
import { BOOKS, BOOKS_ID } from "./constants";
import Books from "./Books";
import ReduxProvider from "./ReduxProvider";

const wait = (time = 600) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), time);
  });
};

describe("usePolling", () => {
  let sandbox, provider, BooksComponent, Component;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    provider = new MockProvider(BOOKS_ID, {
      data: BOOKS,
    });
    sandbox.spy(provider, "cleanCache");
  });

  afterEach(() => {
    providers.clear();
    sandbox.restore();
  });

  describe("when no provider is defined", () => {
    beforeEach(() => {
      BooksComponent = () => {
        const books = useData(provider);
        usePolling();
        return <Books books={books} />;
      };

      Component = () => (
        <ReduxProvider>
          <BooksComponent />
        </ReduxProvider>
      );
    });

    it("should do nothing", async () => {
      render(<Component />);
      await wait(2000);
      expect(provider.cleanCache.callCount).toEqual(0);
    });
  });

  describe("when used alone", () => {
    beforeEach(() => {
      BooksComponent = () => {
        const books = useData(provider);
        usePolling(provider, 500);
        return <Books books={books} />;
      };

      Component = () => (
        <ReduxProvider>
          <BooksComponent />
        </ReduxProvider>
      );
    });

    it("should clean provider cache each 500ms", async () => {
      render(<Component />);
      await wait(2200);
      expect(provider.cleanCache.callCount).toEqual(5);
    });
  });

  describe("when many components are use polling for same provider", () => {
    beforeEach(() => {
      BooksComponent = ({ interval }) => {
        const books = useData(provider);
        usePolling(provider, interval);
        return <Books books={books} />;
      };

      Component = () => (
        <ReduxProvider>
          <BooksComponent interval={500} />
          <BooksComponent interval={1000} />
        </ReduxProvider>
      );
    });

    it("should use the lower polling interval", async () => {
      render(<Component />);
      await wait(2200);
      expect(provider.cleanCache.callCount).toEqual(5);
    });
  });

  describe("when a component use polling is removed", () => {
    beforeEach(() => {
      BooksComponent = ({ interval }) => {
        const books = useData(provider);
        usePolling(provider, interval);
        return <Books books={books} />;
      };

      Component = () => {
        const [showSecondary, setShowSecondary] = useState(true);
        useEffect(() => {
          const timeOut = setTimeout(() => {
            setShowSecondary(false);
          }, 1200);
          return () => {
            clearTimeout(timeOut);
          };
        }, []);
        return (
          <ReduxProvider>
            <BooksComponent interval={1000} />
            {showSecondary && <BooksComponent interval={500} />}
          </ReduxProvider>
        );
      };
    });

    it("should use the next lower polling interval available from the rest of components using it", async () => {
      render(<Component />);
      const promise = wait(3100);
      await act(() => promise);
      expect(provider.cleanCache.callCount).toEqual(4);
    });
  });
});