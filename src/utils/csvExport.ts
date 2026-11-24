import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform, Share } from "react-native";
import { UserItem } from "../api/users";

function escapeCsvValue(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates CSV string matching the user-requested format:
 * ID,Name,Email,Mobile,Role,Shop Name,City,State,Status
 */
export function generateUsersCsv(usersList: UserItem[]): string {
  const headers = [
    "ID",
    "Name",
    "Email",
    "Mobile",
    "Role",
    "Shop Name",
    "City",
    "State",
    "Status",
  ];
  const headerLine = headers.join(",");

  const rows = usersList.map((u) => {
    let mobileStr = u.mobile || "";
    // Format Indian mobile numbers with +91 if raw 10 digits
    if (mobileStr && !mobileStr.startsWith("+") && mobileStr.length === 10) {
      mobileStr = `+91${mobileStr}`;
    }

    return [
      escapeCsvValue(u.id),
      escapeCsvValue(u.name || ""),
      escapeCsvValue(u.email || ""),
      escapeCsvValue(mobileStr),
      escapeCsvValue(u.role_name || ""),
      escapeCsvValue(u.shopname || ""),
      escapeCsvValue(u.city || ""),
      escapeCsvValue(u.state || ""),
      escapeCsvValue(u.status || "active"),
    ].join(",");
  });

  return [headerLine, ...rows].join("\n");
}

/**
 * Computes a readable, dynamic filename based on role filter and date
 * Example: AquaPay_Sub_Admin_Users_2026-11-24.csv
 */
export function getCsvFileName(
  selectedRoleName?: string,
  searchQuery?: string
): string {
  const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  let rolePart = "All_Users";

  if (
    selectedRoleName &&
    selectedRoleName.trim() &&
    selectedRoleName !== "All Roles"
  ) {
    rolePart = selectedRoleName.trim().replace(/[^a-zA-Z0-9]/g, "_");
  }

  if (searchQuery && searchQuery.trim()) {
    const searchPart = searchQuery
      .trim()
      .slice(0, 12)
      .replace(/[^a-zA-Z0-9]/g, "_");
    return `AquaPay_${rolePart}_${searchPart}_${dateStr}.csv`;
  }

  return `AquaPay_${rolePart}_${dateStr}.csv`;
}

/**
 * Exports CSV content to device download/share sheet across Web, Android, and iOS
 */
export async function exportCsvFile(
  csvContent: string,
  fileName: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && typeof document !== "undefined") {
        const blob = new Blob([csvContent], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return {
          success: true,
          message: `File ${fileName} downloaded successfully to your device.`,
        };
      }
    }

    // Native Mobile (Android & iOS)
    try {
      const file = new File(Paths.cache, fileName);
      if (!file.exists) {
        file.create();
      }
      await file.write(csvContent);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/csv",
          dialogTitle: `Download / Save ${fileName}`,
          UTI: "public.comma-separated-values-text",
        });
        return {
          success: true,
          message: `File ${fileName} prepared for download.`,
        };
      }
    } catch {
      // Fallback in case of sandboxed or older engine
    }

    // Fallback to React Native Share
    await Share.share({
      title: fileName,
      message: csvContent,
    });
    return {
      success: true,
      message: `File ${fileName} shared successfully.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || "Failed to export CSV file.",
    };
  }
}
