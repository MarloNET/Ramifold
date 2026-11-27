import type { ReactNode } from "react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { Icon, type IconName } from "./Icon";

// Modal dialog (TechSpec 4.3, 2.16): React Aria `Modal` and `Dialog` with focus trap, ESC closes and focus returns to
// the trigger. With `headIcon` it is a warning or error dialog (`role="alertdialog"`) with the symbol left of the
// heading. Basic form; `showClose` and the banner slot follow with the tasks #76, #81, #86.

export type ModalDialogHeadIcon = { icon: IconName; tone: "error" | "status-concept" };

export function ModalDialog(props: {
  title: string;
  headIcon?: ModalDialogHeadIcon;
  onClose: () => void;
  /** Buttons at the foot of the dialog, right-aligned. */
  footer: ReactNode;
  children: ReactNode;
}) {
  const { title, headIcon, onClose, footer, children } = props;
  return (
    <ModalOverlay className="modal-overlay" isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal className="modal">
        <Dialog className="modal-dialog" role={headIcon === undefined ? "dialog" : "alertdialog"}>
          <div className="modal-dialog__head" data-tone={headIcon?.tone}>
            {headIcon !== undefined && <Icon name={headIcon.icon} size="heading" />}
            <Heading slot="title" level={2}>{title}</Heading>
          </div>
          {children}
          <div className="modal-dialog__foot">{footer}</div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
