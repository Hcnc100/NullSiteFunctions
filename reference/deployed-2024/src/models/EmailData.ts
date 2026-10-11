import {Timestamp} from "firebase-admin/firestore";

export interface EmailData {
    idEmail: string;
    readonly email: string;
    readonly name: string;
    readonly subject: string;
    readonly isOpen: boolean;
    readonly message: string;
    readonly createdAt: Timestamp;
    readonly updatedAt: Timestamp;
}
