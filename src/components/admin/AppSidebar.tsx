import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Package, Grid3x3, Users, AlertCircle, Beef, UserCircle } from "lucide-react";

const items = [
  { title: "نظرة عامة", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "توكيلات الأضاحي", url: "/admin/orders", icon: Beef },
  { title: "المنتجات", url: "/admin/products", icon: Package },
  { title: "مصفوفة الأسعار", url: "/admin/pricing", icon: Grid3x3 },
  { title: "المستخدمون", url: "/admin/users", icon: Users },
  { title: "حسابي", url: "/admin/account", icon: UserCircle },
  { title: "سجل الفشل", url: "/admin/audit", icon: AlertCircle },
];

export default function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent>
        <div className="px-3 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
              A
            </div>
            {!collapsed && <span className="font-bold">Admin</span>}
          </div>
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>القوائم</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end
                  ? pathname === item.url
                  : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active}>
                      <NavLink to={item.url} end={item.end} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
