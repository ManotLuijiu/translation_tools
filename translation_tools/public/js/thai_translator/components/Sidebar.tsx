import React from "react";
import { FileText, Settings, Book } from "lucide-react";

interface SidebarProps {
  activeTab: "translate" | "settings" | "glossary";
  setActiveTab: (tab: "translate" | "settings" | "glossary") => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: "translate", label: "Translate", icon: FileText },
    { id: "glossary", label: "Glossary", icon: Book },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <aside className="w-64 border-r bg-muted/40 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">Translation Tools</h2>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/70 hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
