import React from "react";
import { Flex, Menu } from "@mantine/core";
import { event as gaEvent } from "nextjs-google-analytics";
import toast from "react-hot-toast";
import { CgChevronDown } from "react-icons/cg";
import useFile from "../../../store/useFile";
import { useModal } from "../../../store/useModal";
import { StyledToolElement } from "./styles";

export const FileMenu = () => {
  const setVisible = useModal(state => state.setVisible);
  const getContents = useFile(state => state.getContents);
  const getFormat = useFile(state => state.getFormat);
  const setContents = useFile(state => state.setContents);
  const setFormat = useFile(state => state.setFormat);

  const handleSave = () => {
    const a = document.createElement("a");
    const file = new Blob([getContents()], { type: "text/plain" });

    a.href = window.URL.createObjectURL(file);
    a.download = `jsoncrack.${getFormat()}`;
    a.click();

    gaEvent("save_file", { label: getFormat() });
  };

  const handleLoadSaved = () => {
    const savedContent = localStorage.getItem("jsoncrack_saved_content");
    const savedFormat = localStorage.getItem("jsoncrack_saved_format");
    
    if (savedContent) {
      setContents({ contents: savedContent, hasChanges: false });
      if (savedFormat) {
        setFormat(savedFormat as any);
      }
      toast.success("Saved content loaded successfully!");
      gaEvent("load_saved_content");
    } else {
      toast.error("No saved content found");
    }
  };

  const hasSavedContent = localStorage.getItem("jsoncrack_saved_content") !== null;

  return (
    <Menu shadow="md" withArrow>
      <Menu.Target>
        <StyledToolElement title="File">
          <Flex align="center" gap={3}>
            File
            <CgChevronDown />
          </Flex>
        </StyledToolElement>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item fz={12} onClick={() => setVisible("ImportModal", true)}>
          Import
        </Menu.Item>
        {hasSavedContent && (
          <Menu.Item fz={12} onClick={handleLoadSaved}>
            Load Saved
          </Menu.Item>
        )}
        <Menu.Item fz={12} onClick={handleSave}>
          Export
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
};
