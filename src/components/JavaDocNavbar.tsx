import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { AutoComplete, Input, Space, Typography, Tag, Select } from "antd";
import {
    SearchOutlined,
    ApiOutlined,
    FolderOutlined,
    CodeOutlined,
    FieldStringOutlined,
    DownOutlined,
} from "@ant-design/icons";
import Fuse, { FuseResult } from "fuse.js";
import { ProjectDocIndex } from "../types";

const { Text } = Typography;

interface SearchItem {
    type: "class" | "package" | "method" | "field";
    name: string;
    fullName: string;
    path: string;
    parentShortName?: string;
}

interface JavaDocNavbarProps {
    docIndex: ProjectDocIndex | null;
    availableVersions: string[];
    currentVersion: string;
    onVersionChange: (version: string) => void;
}

export const JavaDocNavbar: React.FC<JavaDocNavbarProps> = ({
    docIndex,
    availableVersions,
    currentVersion,
    onVersionChange,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchValue, setSearchValue] = useState("");
    const [debouncedSearchValue, setDebouncedSearchValue] = useState("");
    const debounceTimerRef = useRef<NodeJS.Timeout>();

    // Debounce search input
    const handleSearchDebounce = useCallback((value: string) => {
        setSearchValue(value);
        
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        
        debounceTimerRef.current = setTimeout(() => {
            setDebouncedSearchValue(value);
        }, 300); // 300ms delay
    }, []);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const fuse = useMemo(() => {
        if (!docIndex) return null;
        const list: SearchItem[] = [];
        docIndex.classes?.forEach((cls) => {
            list.push({
                type: "class",
                name: cls.className,
                fullName: cls.fullName,
                path: `/class/${cls.fullName}`,
            });
            cls.methods?.forEach((method) =>
                list.push({
                    type: "method",
                    name: method.name,
                    fullName: `${cls.fullName}.${method.name}`,
                    path: `/class/${cls.fullName}#method-${method.name}`,
                    parentShortName: cls.className,
                })
            );
            cls.fields?.forEach((field) =>
                list.push({
                    type: "field",
                    name: field.name,
                    fullName: `${cls.fullName}.${field.name}`,
                    path: `/class/${cls.fullName}#field-${field.name}`,
                    parentShortName: cls.className,
                })
            );
        });
        docIndex.packages?.forEach((_, pkgName) => {
            list.push({
                type: "package",
                name: pkgName.split(".").pop() || pkgName,
                fullName: pkgName,
                path: `/package/${pkgName}`,
            });
        });
        return new Fuse(list, {
            keys: [
                { name: "name", weight: 0.7 },
                { name: "fullName", weight: 0.3 },
            ],
            includeScore: true,
            threshold: 0.4,
            minMatchCharLength: 2, // Require at least 2 characters
        });
    }, [docIndex]);

    useEffect(() => {
        setSearchValue("");
        setDebouncedSearchValue("");
    }, [location]);

    const handleSearch = (value: string) => {
        handleSearchDebounce(value);
    };

    const renderTitle = (title: string) => (
        <Text
            type="secondary"
            className="javadoc-search-popup-title"
        >
            {title}
        </Text>
    );

    const renderOption = (item: SearchItem, isExact = false) => {
        const { type, name, path, parentShortName, fullName } = item;
        let icon,
            description = fullName;
        switch (type) {
            case "class":
                icon = <ApiOutlined style={{ color: "#52c41a" }} />;
                break;
            case "package":
                icon = <FolderOutlined style={{ color: "#1677ff" }} />;
                break;
            case "method":
                icon = <CodeOutlined style={{ color: "#eb2f96" }} />;
                description = `in ${parentShortName}`;
                break;
            case "field":
                icon = <FieldStringOutlined style={{ color: "#fa8c16" }} />;
                description = `in ${parentShortName}`;
                break;
        }
        return {
            key: path,
            value: path,
            label: (
                <div className="option-label">
                    <Space>
                        {icon}
                        <div>
                            <Text>{name}</Text>
                            <br />
                            <Text type="secondary" className="option-label-description">
                                {description}
                            </Text>
                        </div>
                    </Space>
                    {isExact && <Tag color="success">Exact</Tag>}
                </div>
            ),
        };
    };

    const options = useMemo(() => {
        if (!fuse || !debouncedSearchValue || debouncedSearchValue.length < 2) return [];
        const results = fuse.search(debouncedSearchValue).slice(0, 30);
        const grouped: { [key: string]: FuseResult<SearchItem>[] } = {
            class: [],
            package: [],
            method: [],
            field: [],
        };
        let exactMatch: FuseResult<SearchItem> | null = null;

        const exactIndex = results.findIndex(
            (r) =>
                r.item.type === "class" &&
                r.item.name.toLowerCase() === debouncedSearchValue.toLowerCase()
        );
        if (exactIndex > -1) exactMatch = results.splice(exactIndex, 1)[0];

        results.forEach((res) => {
            if (
                !grouped[res.item.type].some(
                    (existing) => existing.item.path === res.item.path
                )
            ) {
                grouped[res.item.type].push(res);
            }
        });

        const optionGroups: {
            label: React.ReactNode;
            options: { key: string; value: string; label: JSX.Element }[];
        }[] = [];
        if (exactMatch)
            optionGroups.push({
                label: renderTitle("Exact Match"),
                options: [renderOption(exactMatch.item, true)],
            });
        if (grouped.class.length)
            optionGroups.push({
                label: renderTitle("Classes"),
                options: grouped.class.map((res) => renderOption(res.item)),
            });
        if (grouped.package.length)
            optionGroups.push({
                label: renderTitle("Packages"),
                options: grouped.package.map((res) => renderOption(res.item)),
            });
        if (grouped.method.length)
            optionGroups.push({
                label: renderTitle("Methods"),
                options: grouped.method.map((res) => renderOption(res.item)),
            });
        if (grouped.field.length)
            optionGroups.push({
                label: renderTitle("Fields"),
                options: grouped.field.map((res) => renderOption(res.item)),
            });

        return optionGroups;
    }, [debouncedSearchValue, fuse]);

    const onSelect = (value: string) => {
        navigate(value);
    };

    return (
        <div className="javadoc-navbar">
            <AutoComplete
                value={searchValue}
                options={options}
                className="javadoc-search"
                onSelect={onSelect}
                onSearch={handleSearch}
                allowClear
                autoClearSearchValue
                popupClassName="javadoc-search-popup"
                notFoundContent={
                    debouncedSearchValue.length > 0 && debouncedSearchValue.length < 2 ? 
                        "请输入至少2个字符" : 
                        searchValue !== debouncedSearchValue ? 
                            "搜索中..." : 
                            "未找到结果"
                }
            >
                <Input size="large" prefix={<SearchOutlined />} />
            </AutoComplete>
            
            <Select
                value={currentVersion}
                onChange={onVersionChange}
                className="version-selector"
                suffixIcon={<DownOutlined />}
            >
                {availableVersions.map((version) => (
                    <Select.Option key={version} value={version}>
                        {version}
                    </Select.Option>
                ))}
            </Select>
        </div>
    );
};
