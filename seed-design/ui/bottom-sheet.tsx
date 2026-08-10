/**
 * @file ui:bottom-sheet
 * @requires @seed-design/react@^2.0.0
 * @requires @seed-design/css@^2.0.0
 **/

"use client";

import IconXmarkLine from "@karrotmarket/react-monochrome-icon/IconXmarkLine";
import { Icon, BottomSheet as SeedBottomSheet, VisuallyHidden } from "@seed-design/react";
import { Portal } from "@seed-design/react-portal";
import type * as React from "react";
import { createContext, forwardRef, useContext, useRef } from "react";

const BottomSheetScrollContext = createContext<{ current: number } | null>(null);

export interface BottomSheetRootProps extends SeedBottomSheet.RootProps {}

/**
 * @see https://seed-design.io/react/components/action-sheet
 */
export const BottomSheetRoot = (props: BottomSheetRootProps) => {
  const { children, onAnimationEnd, onOpenChange, ...otherProps } = props;
  const scrollPosition = useRef(0);

  const restoreScrollPosition = () => {
    const scrollingElement = document.scrollingElement;
    if (scrollingElement) scrollingElement.scrollTop = scrollPosition.current;
  };

  const handleOpenChange: NonNullable<BottomSheetRootProps["onOpenChange"]> = (open, details) => {
    onOpenChange?.(open, details);
    requestAnimationFrame(restoreScrollPosition);
  };

  const handleAnimationEnd: NonNullable<BottomSheetRootProps["onAnimationEnd"]> = (open) => {
    restoreScrollPosition();
    onAnimationEnd?.(open);
  };

  return <BottomSheetScrollContext.Provider value={scrollPosition}><SeedBottomSheet.Root {...otherProps} onOpenChange={handleOpenChange} onAnimationEnd={handleAnimationEnd}>{children}</SeedBottomSheet.Root></BottomSheetScrollContext.Provider>;
};

export interface BottomSheetTriggerProps extends SeedBottomSheet.TriggerProps {}

export const BottomSheetTrigger = forwardRef<HTMLButtonElement, BottomSheetTriggerProps>(
  ({ onClickCapture, ...props }, ref) => {
    const scrollPosition = useContext(BottomSheetScrollContext);

    return <SeedBottomSheet.Trigger ref={ref} {...props} onClickCapture={(event) => {
      if (scrollPosition) scrollPosition.current = document.scrollingElement?.scrollTop ?? 0;
      onClickCapture?.(event);
    }} />;
  },
);

BottomSheetTrigger.displayName = "BottomSheetTrigger";

export interface BottomSheetContentProps extends Omit<SeedBottomSheet.ContentProps, "title"> {
  title?: React.ReactNode;

  description?: React.ReactNode;

  layerIndex?: number;

  /**
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * @default false
   */
  showHandle?: boolean;
}

export const BottomSheetContent = forwardRef<HTMLDivElement, BottomSheetContentProps>(
  (
    {
      children,
      title,
      description,
      layerIndex,
      showCloseButton = true,
      showHandle = false,
      ...otherProps
    },
    ref,
  ) => {
    if (
      !title &&
      !otherProps["aria-labelledby"] &&
      !otherProps["aria-label"] &&
      process.env.NODE_ENV !== "production"
    ) {
      console.warn(
        "BottomSheetContent: aria-labelledby or aria-label should be provided if title is not provided.",
      );
    }

    const shouldRenderHeader = title || description;

    return (
      <Portal>
        <SeedBottomSheet.Positioner style={{ "--layer-index": layerIndex } as React.CSSProperties}>
          <SeedBottomSheet.Backdrop />
          <SeedBottomSheet.Content ref={ref} {...otherProps}>
            {showHandle && <SeedBottomSheet.Handle />}
            {shouldRenderHeader && (
              <SeedBottomSheet.Header>
                {title ? (
                  <SeedBottomSheet.Title>{title}</SeedBottomSheet.Title>
                ) : (
                  <VisuallyHidden asChild>
                    <SeedBottomSheet.Title>{otherProps["aria-label"] || ""}</SeedBottomSheet.Title>
                  </VisuallyHidden>
                )}
                {description && (
                  <SeedBottomSheet.Description>{description}</SeedBottomSheet.Description>
                )}
              </SeedBottomSheet.Header>
            )}
            {children}
            {showCloseButton && (
              // You may implement your own i18n for dismiss label
              <SeedBottomSheet.CloseButton aria-label="닫기">
                <Icon svg={<IconXmarkLine />} />
              </SeedBottomSheet.CloseButton>
            )}
          </SeedBottomSheet.Content>
        </SeedBottomSheet.Positioner>
      </Portal>
    );
  },
);

export interface BottomSheetBodyProps extends SeedBottomSheet.BodyProps {}

export const BottomSheetBody = SeedBottomSheet.Body;

export interface BottomSheetFooterProps extends SeedBottomSheet.FooterProps {}

export const BottomSheetFooter = SeedBottomSheet.Footer;

/**
 * This file is a snippet from SEED Design, helping you get started quickly with @seed-design/* packages.
 * You can extend this snippet however you want.
 */
