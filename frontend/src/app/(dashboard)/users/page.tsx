"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Plus, Mail, Phone, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type UserRole = "va" | "system_consultant" | "project_manager";

interface CompanyUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "active" | "inactive";
  joinedDate: string;
}

const roleLabels: Record<UserRole, string> = {
  va: "VA",
  system_consultant: "System Consultant",
  project_manager: "Project Manager",
};

const roleColors: Record<UserRole, string> = {
  va: "bg-blue-500",
  system_consultant: "bg-purple-500",
  project_manager: "bg-green-500",
};

// Placeholder users
const placeholderUsers: CompanyUser[] = [
  {
    id: "1",
    firstName: "Maria",
    lastName: "Santos",
    email: "maria.santos@company.com",
    phone: "(555) 123-4567",
    role: "va",
    status: "active",
    joinedDate: "2024-01-15",
  },
  {
    id: "2",
    firstName: "Carlos",
    lastName: "Rodriguez",
    email: "carlos.rodriguez@company.com",
    phone: "(555) 234-5678",
    role: "system_consultant",
    status: "active",
    joinedDate: "2023-06-20",
  },
  {
    id: "3",
    firstName: "Ana",
    lastName: "Garcia",
    email: "ana.garcia@company.com",
    phone: "(555) 345-6789",
    role: "project_manager",
    status: "active",
    joinedDate: "2023-03-10",
  },
  {
    id: "4",
    firstName: "Miguel",
    lastName: "Fernandez",
    email: "miguel.fernandez@company.com",
    phone: "(555) 456-7890",
    role: "va",
    status: "active",
    joinedDate: "2024-02-28",
  },
  {
    id: "5",
    firstName: "Sofia",
    lastName: "Martinez",
    email: "sofia.martinez@company.com",
    phone: "(555) 567-8901",
    role: "system_consultant",
    status: "inactive",
    joinedDate: "2022-11-05",
  },
  {
    id: "6",
    firstName: "Luis",
    lastName: "Hernandez",
    email: "luis.hernandez@company.com",
    phone: "(555) 678-9012",
    role: "project_manager",
    status: "active",
    joinedDate: "2023-09-18",
  },
];

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [users] = useState<CompanyUser[]>(placeholderUsers);

  const filteredUsers = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.phone.includes(searchQuery) ||
      roleLabels[user.role].toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Users</h1>
          <p className="text-muted-foreground">
            Manage your team members and their roles.
          </p>
        </div>
        <Button className="bg-[#ff5603] hover:bg-[#ff5603]/90">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users Table */}
      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-slate-100 text-slate-600 text-sm font-medium">
                          {getInitials(user.firstName, user.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${roleColors[user.role]} text-white`}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{user.phone}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === "active" ? "default" : "secondary"}
                      className={
                        user.status === "active"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-100"
                      }
                    >
                      {user.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.joinedDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit User</DropdownMenuItem>
                        <DropdownMenuItem>Change Role</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-muted-foreground"
                >
                  {searchQuery
                    ? "No users found matching your search"
                    : "No users yet"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
