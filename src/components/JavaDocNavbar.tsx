import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { AutoComplete, Input, Space, Typography, Tag } from "antd";
import {
    SearchOutlined,
    ApiOutlined,
    FolderOutlined,
    CodeOutlined,
    FieldStringOutlined,
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

export const JavaDocNavbar: React.FC<{ docIndex: ProjectDocIndex | null }> = ({
    docIndex,
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchValue, setSearchValue] = useState("");

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
            minMatchCharLength: 1,
        });
    }, [docIndex]);

    useEffect(() => {
        setSearchValue("");
    }, [location]);

    const handleSearch = (value: string) => {
        setSearchValue(value);
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
                            <Text type="secondary" style={{ fontSize: "11px" }}>
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
        if (!fuse || !searchValue) return [];
        const results = fuse.search(searchValue).slice(0, 30);
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
                r.item.name.toLowerCase() === searchValue.toLowerCase()
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
    }, [searchValue, fuse]);

    const onSelect = (value: string) => {
        navigate(value);
    };

    return (
        <div className="javadoc-navbar">
            <AutoComplete
                value={searchValue}
                options={options}
                style={{ width: 500 }}
                className="javadoc-search"
                onSelect={onSelect}
                onSearch={handleSearch}
                placeholder=""
                allowClear
                autoClearSearchValue
                popupClassName="javadoc-search-popup"
            >
                <Input size="large" prefix={<SearchOutlined />} />
            </AutoComplete>
        </div>
    );
};
