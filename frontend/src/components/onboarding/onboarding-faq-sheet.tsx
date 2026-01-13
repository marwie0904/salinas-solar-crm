"use client";

import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  GitBranch,
  Users,
  Target,
  Calendar,
  FileSignature,
  FileText,
  MessageSquare,
  CheckSquare,
  Receipt,
  Bell,
  RotateCcw,
} from "lucide-react";
import { faqSections, type FaqSection, type FaqItem } from "./faq-content";
import { useOnboardingContext } from "./onboarding-tour";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  GitBranch,
  Users,
  Target,
  Calendar,
  FileSignature,
  FileText,
  MessageSquare,
  CheckSquare,
  Receipt,
  Bell,
};

interface OnboardingFaqSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingFaqSheet({ open, onOpenChange }: OnboardingFaqSheetProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const { restartTour } = useOnboardingContext();

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return faqSections;
    }

    const lowerQuery = searchQuery.toLowerCase();
    return faqSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.question.toLowerCase().includes(lowerQuery) ||
            item.answer.toLowerCase().includes(lowerQuery)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleItem = (itemKey: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemKey)) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });
  };

  const handleRestartTour = () => {
    onOpenChange(false);
    restartTour();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="text-xl">Help & FAQ</SheetTitle>
          <SheetDescription>
            Find answers to common questions about using the CRM
          </SheetDescription>
        </SheetHeader>

        {/* Search */}
        <div className="relative px-4 py-3 border-b">
          <Search className="absolute left-7 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search FAQ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* FAQ Content */}
        <ScrollArea className="flex-1 px-4">
          <div className="py-4 space-y-2">
            {filteredSections.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No results found for &quot;{searchQuery}&quot;
              </div>
            ) : (
              filteredSections.map((section) => (
                <FaqSectionComponent
                  key={section.id}
                  section={section}
                  isExpanded={expandedSections.has(section.id) || searchQuery.length > 0}
                  expandedItems={expandedItems}
                  onToggleSection={() => toggleSection(section.id)}
                  onToggleItem={toggleItem}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="border-t">
          <Button
            variant="outline"
            onClick={handleRestartTour}
            className="w-full gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Restart Onboarding Tour
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

interface FaqSectionComponentProps {
  section: FaqSection;
  isExpanded: boolean;
  expandedItems: Set<string>;
  onToggleSection: () => void;
  onToggleItem: (itemKey: string) => void;
}

function FaqSectionComponent({
  section,
  isExpanded,
  expandedItems,
  onToggleSection,
  onToggleItem,
}: FaqSectionComponentProps) {
  const IconComponent = iconMap[section.icon] || LayoutDashboard;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Section Header */}
      <button
        onClick={onToggleSection}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="p-2 bg-orange-50 rounded-lg">
          <IconComponent className="h-4 w-4 text-[#ff5603]" />
        </div>
        <span className="flex-1 font-medium text-gray-900">{section.title}</span>
        <span className="text-xs text-gray-400 mr-2">{section.items.length} questions</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {/* Section Items */}
      {isExpanded && (
        <div className="border-t bg-gray-50">
          {section.items.map((item, index) => {
            const itemKey = `${section.id}-${index}`;
            const isItemExpanded = expandedItems.has(itemKey);

            return (
              <FaqItemComponent
                key={itemKey}
                item={item}
                isExpanded={isItemExpanded}
                onToggle={() => onToggleItem(itemKey)}
                isLast={index === section.items.length - 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface FaqItemComponentProps {
  item: FaqItem;
  isExpanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}

function FaqItemComponent({ item, isExpanded, onToggle, isLast }: FaqItemComponentProps) {
  return (
    <div className={`${!isLast ? "border-b border-gray-200" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-2 p-3 hover:bg-gray-100 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-[#ff5603] mt-0.5 flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
        )}
        <span className="text-sm text-gray-700">{item.question}</span>
      </button>
      {isExpanded && (
        <div className="px-3 pb-3 pl-9">
          <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}
