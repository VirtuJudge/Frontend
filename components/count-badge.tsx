"use client";

import React from "react";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { Wrapper } from "./wrapper";
import { apiClient } from "@/lib/api/client";
import { useAuth } from "@/features/auth";
import { cn } from "@/lib/utils";

export interface CountBadgeProps {
  count?: number;
  label: string;
  icon?: string;
  iconClassName?: string;
  className?: string;
}

export function CountBadge({
  count = 0,
  label,
  icon,
  iconClassName = "text-2xl",
  className,
}: CountBadgeProps) {
  return (
    <Wrapper
      className={cn(
        "flex items-center gap-2 px-4 py-3 rounded-full text-sm shrink-0",
        className,
      )}
    >
      {icon && <Icon icon={icon} className={iconClassName} />}
      <span>
        {count} {label}
      </span>
    </Wrapper>
  );
}

export interface ProjectAssetsCountBadgeProps {
  projectId?: string;
  count?: number;
  className?: string;
}

export function ProjectAssetsCountBadge({
  projectId,
  count: propCount,
  className,
}: ProjectAssetsCountBadgeProps) {
  const { data: assetsPage } = useQuery({
    queryKey: ["projectAssets", projectId],
    queryFn: () => apiClient.getAssets(projectId!),
    enabled: propCount === undefined && !!projectId,
  });
  const filteredAssets = assetsPage?.items?.filter((asset) => asset.state === "verified") || [];  
  const count = propCount ?? filteredAssets.length ?? 0;

  return (
    <CountBadge
      count={count}
      label="Assets"
      icon="solar:document-text-linear"
      className={className}
    />
  );
}

export const AssetsCountBadge = ProjectAssetsCountBadge;

export interface TeamProjectsCountBadgeProps {
  teamId?: string;
  count?: number;
  className?: string;
}

export function TeamProjectsCountBadge({
  teamId,
  count: propCount,
  className,
}: TeamProjectsCountBadgeProps) {
  const { data: projectsPage } = useQuery({
    queryKey: ["teamProjects", teamId],
    queryFn: () => apiClient.getProjects(teamId!),
    enabled: propCount === undefined && !!teamId,
  });
  const count = propCount ?? projectsPage?.items?.length ?? 0;

  return (
    <CountBadge
      count={count}
      label="Projects"
      icon="solar:box-minimalistic-linear"
      className={className}
    />
  );
}

export const ProjectsCountBadge = TeamProjectsCountBadge;

export interface MembersCountBadgeProps {
  teamId?: string;
  count?: number;
  className?: string;
}

export function MembersCountBadge({
  teamId,
  count: propCount,
  className,
}: MembersCountBadgeProps) {
  const { data: membersPage } = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => apiClient.getTeamMembers(teamId!),
    enabled: propCount === undefined && !!teamId,
  });
  const memberCount = propCount ?? membersPage?.items?.length ?? 0;

  return (
    <CountBadge
      count={memberCount}
      label="Members"
      icon="fluent:people-community-24-regular"
      className={className}
    />
  );
}

export const TeamMembersCountBadge = MembersCountBadge;

export interface TeamRoleBadgeProps {
  teamId: string;
  fallbackRole?: string;
  className?: string;
}

export function TeamRoleBadge({
  teamId,
  fallbackRole,
  className,
}: TeamRoleBadgeProps) {
  const { user } = useAuth();
  const { data: membersPage } = useQuery({
    queryKey: ["teamMembers", teamId],
    queryFn: () => apiClient.getTeamMembers(teamId),
  });
  const members = membersPage?.items || [];
  const currentMembership = members.find((m) => m.user_id === user?.id);
  const role = currentMembership?.role || fallbackRole;

  if (!role) return null;

  return (
    <Wrapper
      variant="glass-dark"
      className={cn(
        "flex items-center justify-center align-middle gap-2 px-4 py-3 rounded-full text-fg/90 shrink-0",
        className,
      )}
    >
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </Wrapper>
  );
}
