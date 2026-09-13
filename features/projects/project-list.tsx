"use client";

import React, { useState } from "react";
import { Button, Text, Wrapper } from "@/components";
import { Project } from "@/lib/api/types";
import { CreateProjectModal } from "./create-project-modal";

interface ProjectListProps {
  teamId: string;
  teamName?: string;
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
      <div className="flex justify-between items-center gap-4">
        <div className="pl-2">
          <Text as="h2" size="md" className="font-bold text-left">
            Projects
          </Text>
          <Text size="sm" className="text-left">
            Add projects to your team and practice your pitch with your team
            members.
          </Text>
        </div>
        {projects.length > 0 && (
          <Button
            variant="glass"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="text-sm"
          >
            + New Project
          </Button>
        )}
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
          <Text size="sm">
            Get started by creating your first pitch project to upload assets
            and start practice sessions.
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <Wrapper
              key={proj.id}
              className="p-5 flex flex-col justify-between gap-4"
            >
              <div className="flex flex-col gap-1 h-full">
                <Text
                  as="h3"
                  size="md"
                  className="font-bold truncate text-wrap text-left"
                >
                  {proj.name}
                </Text>
                {proj.description && (
                  <Text size="sm" className="text-left line-clamp-3">
                    {proj.description}
                  </Text>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-foreground/60">
                <Text size="xs">
                  Created: {new Date(proj.created_at).toLocaleDateString()}
                </Text>
                <Button
                  href={`/projects/${proj.id}`}
                  size="sm"
                  variant="primary"
                >
                  View Project
                </Button>
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
