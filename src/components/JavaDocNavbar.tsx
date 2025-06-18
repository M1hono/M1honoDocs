import React, { useState, useMemo } from 'react';
import { AutoComplete, Input, Typography, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ProjectDocIndex, JavaClassDoc } from '../types';
import { SearchOutlined, ApiOutlined, FolderOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface JavaDocNavbarProps {
    docIndex: ProjectDocIndex | null;
}

export const JavaDocNavbar: React.FC<JavaDocNavbarProps> = ({ docIndex }) => {
    const [searchOptions, setSearchOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);
    const navigate = useNavigate();

    const highlightMatch = (text: string, highlight: string) => {
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <strong key={i}>{part}</strong>
                    ) : (
                        part
                    )
                )}
            </span>
        );
    };

    const handleSearch = (value: string) => {
        if (!value || !docIndex) {
            setSearchOptions([]);
            return;
        }
        
        const options: { value: string; label: React.ReactNode }[] = [];
        const cleanedValue = value.replace(/\.java$/, '').toLowerCase();

        const classMatches = Array.from(docIndex.classes.values())
            .filter(cls => cls.fullName.toLowerCase().includes(cleanedValue))
            .slice(0, 15);

        classMatches.forEach(cls => {
            options.push({
                value: `/class/${encodeURIComponent(cls.fullName)}`,
                label: <div>{highlightMatch(cls.fullName, value)}</div>
            });
        });

        if (classMatches.length > 0) {
            options.push({ value: 'divider', label: <Divider /> });
        }

        const packageMatches = Array.from(docIndex.packages.keys())
            .filter(pkgName => pkgName.toLowerCase().includes(cleanedValue))
            .slice(0, 10);

        packageMatches.forEach(pkgName => {
            options.push({
                value: `/package/${encodeURIComponent(pkgName)}`,
                label: <div>{highlightMatch(pkgName, value)}</div>
            });
        });

        setSearchOptions(options);
    };

    const onSelect = (value: string) => {
        if (value && value !== 'divider') {
            navigate(value);
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0' }}>
            <Title level={4} style={{ margin: 0 }}>JavaDoc</Title>
            <AutoComplete
                options={searchOptions}
                style={{ width: 400 }}
                onSelect={onSelect}
                onSearch={handleSearch}
                placeholder="Search classes or packages"
            >
                <Input suffix={<SearchOutlined />} />
            </AutoComplete>
        </div>
    );
}; 