/**
 * ASEAN Translations Page
 * ERPNext/Frappe PO file translation management
 * This is the existing Dashboard functionality preserved as a dedicated page
 */

import Dashboard from '@/components/Dashboard';
import type { TabType } from '@/types';

export interface ASEANTranslationsPageProps {
  onTabChange?: (tab: TabType) => void;
}

export default function ASEANTranslationsPage({ onTabChange }: ASEANTranslationsPageProps) {
  return <Dashboard onTabChange={onTabChange} />;
}
