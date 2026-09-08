"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button, Text, Wrapper } from "@/components";
import { Project } from "@/lib/api/types";
import { CreateProjectModal } from "./create-project-modal";

interface ProjectListProps {
  teamId: string;
  projects: Project[];
  onProjectCreated: (newProject: Project) => void;
}

export function ProjectList({
  teamId,
  projects,
  onProjectCreated,
}: ProjectListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <Text as="h2" size="md" className="font-bold">
            Projects
          </Text>
          <Text size="sm" className="text-foreground/70">
            Pitch projects and assets for this team
          </Text>
        </div>
        <Button
          variant="glass"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-sm"
        >
          + New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Wrapper
          variant="glass"
          borderGradient="neutral"
          className="p-8 text-center flex flex-col items-center gap-3"
        >
          <Text size="md" className="font-semibold">
            No projects yet
          </Text>
          <Text size="sm" className="text-foreground/60 max-w-sm">
            Get started by creating your first pitch project to upload presentations and start practice sessions.
          </Text>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="mt-2"
          >
            Create Your First Project
          </Button>
        </Wrapper>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <Wrapper
              key={proj.id}
              variant="glass"
              borderGradient="neutral"
              className="p-5 flex flex-col justify-between gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="flex flex-col gap-1">
                <Text as="h3" size="md" className="font-bold truncate">
                  {proj.name}
                </Text>
                {proj.description && (
                  <Text size="sm" className="text-foreground/70 line-clamp-2">
                    {proj.description}
                  </Text>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-foreground/60 pt-3 border-t border-foreground/10">
                <span>
                  Created {new Date(proj.created_at).toLocaleDateString()}
                </span>
                <Link
                  href={`/projects/${proj.id}`}
                  className="text-primary hover:underline font-semibold"
                >
                  Open Project →
                </Link>
              </div>
            </Wrapper>
          ))}
        </div>
      )}

      <CreateProjectModal
        teamId={teamId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={onProjectCreated}
      />
    </div>
  );
}
