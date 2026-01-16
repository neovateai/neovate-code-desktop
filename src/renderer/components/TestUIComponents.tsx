import { useState } from 'react';
import {
  Button,
  Input,
  Textarea,
  Checkbox,
  CheckboxGroup,
  RadioGroup,
  Radio,
  Select,
  SelectTrigger,
  SelectValue,
  SelectPopup,
  SelectItem,
  SelectGroup,
  SelectGroupLabel,
  SelectSeparator,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  Separator,
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  Fieldset,
  FieldsetLegend,
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupInput,
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  Menu,
  MenuTrigger,
  MenuPopup,
  MenuItem,
  MenuSeparator,
  MenuGroupLabel,
  MenuCheckboxItem,
  MenuRadioGroup,
  MenuRadioItem,
  Popover,
  PopoverTrigger,
  PopoverPopup,
  PopoverTitle,
  PopoverDescription,
  PopoverClose,
  Dialog,
  DialogTrigger,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
  Tooltip,
  TooltipTrigger,
  TooltipPopup,
  ScrollArea,
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
  ToastProvider,
  toastManager,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
  Autocomplete,
  AutocompleteInput,
  AutocompletePopup,
  AutocompleteList,
  AutocompleteItem,
  AutocompleteEmpty,
} from './ui';
import {
  UserIcon,
  SearchIcon,
  MailIcon,
  PlusIcon,
  DownloadIcon,
  TrashIcon,
  SettingsIcon,
  FileIcon,
} from 'lucide-react';

export function TestUIComponents() {
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [radioValue, setRadioValue] = useState('option1');
  const [selectValue, setSelectValue] = useState<string | null>('apple');
  const [comboboxValue, setComboboxValue] = useState<string | null>('');
  const [menuCheckboxes, setMenuCheckboxes] = useState({
    bookmarks: true,
    urls: false,
  });
  const [menuRadio, setMenuRadio] = useState('pedro');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>(['item-1']);

  const comboboxItems = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'orange', label: 'Orange' },
    { value: 'grape', label: 'Grape' },
    { value: 'mango', label: 'Mango' },
  ];

  const autocompleteItems = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'orange', label: 'Orange' },
    { value: 'grape', label: 'Grape' },
    { value: 'mango', label: 'Mango' },
  ];

  const showToast = (
    type: 'success' | 'error' | 'info' | 'warning' | 'loading',
  ) => {
    toastManager.add({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Toast`,
      description: `This is a ${type} toast notification`,
      type,
    });
  };

  return (
    <ToastProvider>
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            marginBottom: '16px',
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '8px',
          }}
        >
          UI Components Test
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            maxHeight: '600px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          <div className="space-y-12 max-w-7xl mx-auto bg-background">
            <p className="text-muted-foreground">
              Comprehensive showcase of all available UI components from coss ui
            </p>

            <Separator />

            {/* Buttons Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Buttons</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 items-center">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="destructive-outline">
                    Destructive Outline
                  </Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="xs">Extra Small</Button>
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="xl">Extra Large</Button>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="icon-xs">
                    <PlusIcon />
                  </Button>
                  <Button size="icon-sm">
                    <PlusIcon />
                  </Button>
                  <Button size="icon">
                    <PlusIcon />
                  </Button>
                  <Button size="icon-lg">
                    <PlusIcon />
                  </Button>
                  <Button size="icon-xl">
                    <PlusIcon />
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Button>
                    <DownloadIcon />
                    With Icon
                  </Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </section>

            <Separator />

            {/* Inputs Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Inputs</h2>
              <div className="space-y-4 max-w-md">
                <Input placeholder="Default input" />
                <Input size="sm" placeholder="Small input" />
                <Input size="lg" placeholder="Large input" />
                <Input placeholder="Disabled input" disabled />
                <Input type="search" placeholder="Search input" />
                <Input type="email" placeholder="Email input" />
                <Input type="password" placeholder="Password input" />
              </div>
            </section>

            <Separator />

            {/* Textarea Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Textarea</h2>
              <div className="space-y-4 max-w-md">
                <Textarea placeholder="Default textarea" />
                <Textarea size="sm" placeholder="Small textarea" />
                <Textarea size="lg" placeholder="Large textarea" />
                <Textarea placeholder="Disabled textarea" disabled />
              </div>
            </section>

            <Separator />

            {/* Checkboxes Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Checkboxes</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={checkboxChecked}
                    onCheckedChange={(checked) =>
                      setCheckboxChecked(checked === true)
                    }
                  />
                  <label>Single Checkbox</label>
                </div>

                <CheckboxGroup>
                  <div className="flex items-center gap-2">
                    <Checkbox value="option1" />
                    <label>Option 1</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox value="option2" />
                    <label>Option 2</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox value="option3" disabled />
                    <label>Option 3 (Disabled)</label>
                  </div>
                </CheckboxGroup>
              </div>
            </section>

            <Separator />

            {/* Radio Buttons Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Radio Buttons</h2>
              <RadioGroup
                value={radioValue}
                onValueChange={(value) => setRadioValue(value as string)}
              >
                <div className="flex items-center gap-2">
                  <Radio value="option1" />
                  <label>Option 1</label>
                </div>
                <div className="flex items-center gap-2">
                  <Radio value="option2" />
                  <label>Option 2</label>
                </div>
                <div className="flex items-center gap-2">
                  <Radio value="option3" />
                  <label>Option 3</label>
                </div>
                <div className="flex items-center gap-2">
                  <Radio value="option4" disabled />
                  <label>Option 4 (Disabled)</label>
                </div>
              </RadioGroup>
            </section>

            <Separator />

            {/* Select Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Select</h2>
              <div className="space-y-4 max-w-md">
                <Select value={selectValue} onValueChange={setSelectValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectGroup>
                      <SelectGroupLabel>Fruits</SelectGroupLabel>
                      <SelectItem value="apple">Apple</SelectItem>
                      <SelectItem value="banana">Banana</SelectItem>
                      <SelectItem value="orange">Orange</SelectItem>
                    </SelectGroup>
                    <SelectSeparator />
                    <SelectGroup>
                      <SelectGroupLabel>Vegetables</SelectGroupLabel>
                      <SelectItem value="carrot">Carrot</SelectItem>
                      <SelectItem value="potato">Potato</SelectItem>
                    </SelectGroup>
                  </SelectPopup>
                </Select>

                <Select>
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="1">Option 1</SelectItem>
                    <SelectItem value="2">Option 2</SelectItem>
                  </SelectPopup>
                </Select>

                <Select>
                  <SelectTrigger size="lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectItem value="1">Option 1</SelectItem>
                    <SelectItem value="2">Option 2</SelectItem>
                  </SelectPopup>
                </Select>
              </div>
            </section>

            <Separator />

            {/* Combobox Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Combobox</h2>
              <div className="max-w-md">
                <Combobox
                  value={comboboxValue}
                  onValueChange={setComboboxValue}
                  items={comboboxItems}
                >
                  <ComboboxInput
                    placeholder="Search fruits..."
                    showTrigger
                    showClear
                  />
                  <ComboboxPopup>
                    <ComboboxList>
                      <ComboboxEmpty>No results found.</ComboboxEmpty>
                      {comboboxItems.map((item) => (
                        <ComboboxItem key={item.value} value={item.value}>
                          {item.label}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </div>
            </section>

            <Separator />

            {/* Autocomplete Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Autocomplete</h2>
              <div className="max-w-md space-y-8">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Basic Autocomplete</h3>
                  <Autocomplete items={autocompleteItems}>
                    <AutocompleteInput placeholder="Search fruits..." />
                    <AutocompletePopup>
                      <AutocompleteEmpty>No results found.</AutocompleteEmpty>
                      <AutocompleteList>
                        {(item) => (
                          <AutocompleteItem key={item.value} value={item}>
                            {item.label}
                          </AutocompleteItem>
                        )}
                      </AutocompleteList>
                    </AutocompletePopup>
                  </Autocomplete>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">
                    With Trigger and Clear
                  </h3>
                  <Autocomplete items={autocompleteItems}>
                    <AutocompleteInput
                      placeholder="Search with controls..."
                      showTrigger
                      showClear
                    />
                    <AutocompletePopup>
                      <AutocompleteEmpty>No results found.</AutocompleteEmpty>
                      <AutocompleteList>
                        {(item) => (
                          <AutocompleteItem key={item.value} value={item.value}>
                            {item.label}
                          </AutocompleteItem>
                        )}
                      </AutocompleteList>
                    </AutocompletePopup>
                  </Autocomplete>
                </div>
              </div>
            </section>

            <Separator />

            {/* Avatar Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Avatars</h2>
              <div className="flex gap-4 items-center">
                <Avatar>
                  <AvatarImage src="https://github.com/shadcn.png" alt="User" />
                  <AvatarFallback>CN</AvatarFallback>
                </Avatar>
                <Avatar className="size-12">
                  <AvatarFallback>
                    <UserIcon />
                  </AvatarFallback>
                </Avatar>
                <Avatar className="size-16">
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>
            </section>

            <Separator />

            {/* Spinner Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Spinner</h2>
              <div className="flex gap-4 items-center">
                <Spinner className="size-4" />
                <Spinner className="size-6" />
                <Spinner className="size-8" />
                <Spinner className="size-12" />
              </div>
            </section>

            <Separator />

            {/* Field Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Fields</h2>
              <div className="space-y-4 max-w-md">
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" placeholder="Enter your email" />
                  <FieldDescription>
                    We'll never share your email.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input type="password" placeholder="Enter your password" />
                  <FieldError>
                    Password must be at least 8 characters.
                  </FieldError>
                </Field>
              </div>
            </section>

            <Separator />

            {/* Fieldset Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Fieldset</h2>
              <Fieldset>
                <FieldsetLegend>Personal Information</FieldsetLegend>
                <Field>
                  <FieldLabel>Name</FieldLabel>
                  <Input placeholder="Enter your name" />
                </Field>
                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input type="email" placeholder="Enter your email" />
                </Field>
              </Fieldset>
            </section>

            <Separator />

            {/* Input Group Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Input Groups</h2>
              <div className="space-y-4 max-w-md">
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>
                      <SearchIcon />
                    </InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput placeholder="Search..." />
                </InputGroup>

                <InputGroup>
                  <InputGroupInput placeholder="Enter email" type="email" />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>
                      <MailIcon />
                    </InputGroupText>
                  </InputGroupAddon>
                </InputGroup>

                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <InputGroupText>https://</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput placeholder="example.com" />
                  <InputGroupAddon align="inline-end">
                    <Button size="sm">Go</Button>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </section>

            <Separator />

            {/* Menu Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Menu (Dropdown)</h2>
              <Menu>
                <MenuTrigger
                  render={<Button variant="outline">Open Menu</Button>}
                />
                <MenuPopup>
                  <MenuGroupLabel>My Account</MenuGroupLabel>
                  <MenuItem>
                    <UserIcon />
                    Profile
                  </MenuItem>
                  <MenuItem>
                    <SettingsIcon />
                    Settings
                  </MenuItem>
                  <MenuSeparator />
                  <MenuCheckboxItem
                    checked={menuCheckboxes.bookmarks}
                    onCheckedChange={(checked) =>
                      setMenuCheckboxes({
                        ...menuCheckboxes,
                        bookmarks: checked,
                      })
                    }
                  >
                    Show Bookmarks Bar
                  </MenuCheckboxItem>
                  <MenuCheckboxItem
                    checked={menuCheckboxes.urls}
                    onCheckedChange={(checked) =>
                      setMenuCheckboxes({ ...menuCheckboxes, urls: checked })
                    }
                  >
                    Show Full URLs
                  </MenuCheckboxItem>
                  <MenuSeparator />
                  <MenuRadioGroup
                    value={menuRadio}
                    onValueChange={setMenuRadio}
                  >
                    <MenuRadioItem value="pedro">Pedro</MenuRadioItem>
                    <MenuRadioItem value="colm">Colm</MenuRadioItem>
                  </MenuRadioGroup>
                  <MenuSeparator />
                  <MenuItem variant="destructive">
                    <TrashIcon />
                    Delete
                  </MenuItem>
                </MenuPopup>
              </Menu>
            </section>

            <Separator />

            {/* Popover Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Popover</h2>
              <Popover>
                <PopoverTrigger
                  render={<Button variant="outline">Open Popover</Button>}
                />
                <PopoverPopup>
                  <PopoverTitle>Dimensions</PopoverTitle>
                  <PopoverDescription>
                    Set the dimensions for the layer.
                  </PopoverDescription>
                  <div className="grid gap-4 mt-4">
                    <Field>
                      <FieldLabel>Width</FieldLabel>
                      <Input placeholder="100%" />
                    </Field>
                    <Field>
                      <FieldLabel>Height</FieldLabel>
                      <Input placeholder="25px" />
                    </Field>
                  </div>
                  <div className="flex justify-end mt-4">
                    <PopoverClose render={<Button size="sm">Close</Button>} />
                  </div>
                </PopoverPopup>
              </Popover>
            </section>

            <Separator />

            {/* Dialog Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Dialog</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger render={<Button>Open Dialog</Button>} />
                <DialogPopup>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Make changes to your profile here. Click save when you're
                      done.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <Field>
                      <FieldLabel>Name</FieldLabel>
                      <Input placeholder="Enter your name" />
                    </Field>
                    <Field>
                      <FieldLabel>Username</FieldLabel>
                      <Input placeholder="@username" />
                    </Field>
                  </div>
                  <DialogFooter>
                    <DialogClose
                      render={<Button variant="outline">Cancel</Button>}
                    />
                    <Button onClick={() => setDialogOpen(false)}>
                      Save changes
                    </Button>
                  </DialogFooter>
                </DialogPopup>
              </Dialog>
            </section>

            <Separator />

            {/* Alert Dialog Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Alert Dialog</h2>
              <AlertDialog
                open={alertDialogOpen}
                onOpenChange={setAlertDialogOpen}
              >
                <AlertDialogTrigger
                  render={<Button variant="destructive">Delete Account</Button>}
                />
                <AlertDialogPopup>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogClose
                      render={<Button variant="outline">Cancel</Button>}
                    />
                    <Button
                      variant="destructive"
                      onClick={() => setAlertDialogOpen(false)}
                    >
                      Delete
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogPopup>
              </AlertDialog>
            </section>

            <Separator />

            {/* Tooltip Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Tooltip</h2>
              <div className="flex gap-4">
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline">Hover me</Button>}
                  />
                  <TooltipPopup>This is a tooltip</TooltipPopup>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline">Bottom</Button>}
                  />
                  <TooltipPopup side="bottom">Tooltip on bottom</TooltipPopup>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline">Left</Button>}
                  />
                  <TooltipPopup side="left">Tooltip on left</TooltipPopup>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline">Right</Button>}
                  />
                  <TooltipPopup side="right">Tooltip on right</TooltipPopup>
                </Tooltip>
              </div>
            </section>

            <Separator />

            {/* Scroll Area Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Scroll Area</h2>
              <ScrollArea className="h-48 w-full border rounded-lg p-4">
                <div className="space-y-2">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="text-sm">
                      Item {i + 1} - This is scrollable content that
                      demonstrates the scroll area component.
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>

            <Separator />

            {/* Empty State Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Empty State</h2>
              <Empty className="border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileIcon />
                  </EmptyMedia>
                  <EmptyTitle>No files found</EmptyTitle>
                  <EmptyDescription>
                    You don't have any files yet. Start by uploading one.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button>
                    <PlusIcon />
                    Upload File
                  </Button>
                </EmptyContent>
              </Empty>
            </section>

            <Separator />

            {/* Toast Section */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Toast Notifications</h2>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => showToast('success')} variant="outline">
                  Success Toast
                </Button>
                <Button onClick={() => showToast('error')} variant="outline">
                  Error Toast
                </Button>
                <Button onClick={() => showToast('info')} variant="outline">
                  Info Toast
                </Button>
                <Button onClick={() => showToast('warning')} variant="outline">
                  Warning Toast
                </Button>
                <Button onClick={() => showToast('loading')} variant="outline">
                  Loading Toast
                </Button>
              </div>
            </section>

            <Separator />

            {/* Separator Examples */}
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Separators</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-2">Horizontal separator:</p>
                  <div>Content above</div>
                  <Separator className="my-4" />
                  <div>Content below</div>
                </div>
                <div>
                  <p className="text-sm mb-2">Vertical separator:</p>
                  <div className="flex items-center h-8 gap-2">
                    <div>Left</div>
                    <Separator orientation="vertical" />
                    <div>Middle</div>
                    <Separator orientation="vertical" />
                    <div>Right</div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* Accordion Section */}
            <section className="space-y-6">
              <h2 className="text-2xl font-semibold">Accordion</h2>

              <div className="space-y-6 max-w-2xl">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Single Accordion</h3>
                  <p className="text-sm text-muted-foreground">
                    Only one item can be open at a time (multiple={'{'}false
                    {'}'})
                  </p>
                  <Accordion multiple={false} defaultValue={['item-1']}>
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Is it accessible?</AccordionTrigger>
                      <AccordionPanel>
                        Yes. It adheres to the WAI-ARIA design pattern.
                      </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>Is it styled?</AccordionTrigger>
                      <AccordionPanel>
                        Yes. It comes with default styles that matches the other
                        components' aesthetic.
                      </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>Is it animated?</AccordionTrigger>
                      <AccordionPanel>
                        Yes. It's animated by default, but you can disable it if
                        you prefer.
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Multiple Accordion</h3>
                  <p className="text-sm text-muted-foreground">
                    Multiple items can be open at the same time (default
                    behavior)
                  </p>
                  <Accordion defaultValue={['feature-1', 'feature-2']}>
                    <AccordionItem value="feature-1">
                      <AccordionTrigger>Performance</AccordionTrigger>
                      <AccordionPanel>
                        Built with performance in mind, using efficient
                        rendering techniques and minimal re-renders.
                      </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value="feature-2">
                      <AccordionTrigger>Accessibility</AccordionTrigger>
                      <AccordionPanel>
                        Full keyboard navigation support and ARIA attributes for
                        screen readers.
                      </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value="feature-3">
                      <AccordionTrigger>Customization</AccordionTrigger>
                      <AccordionPanel>
                        Easily customizable with Tailwind CSS classes and
                        supports all standard HTML attributes.
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Controlled Accordion</h3>
                  <p className="text-sm text-muted-foreground">
                    Control the accordion state externally (current:{' '}
                    {accordionValue.length > 0
                      ? accordionValue.join(', ')
                      : 'none'}
                    )
                  </p>
                  <Accordion
                    value={accordionValue}
                    onValueChange={setAccordionValue}
                  >
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Can I control this?</AccordionTrigger>
                      <AccordionPanel>
                        Yes! This accordion is controlled by React state,
                        allowing you to programmatically control which panels
                        are open.
                      </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                      <AccordionTrigger>How does it work?</AccordionTrigger>
                      <AccordionPanel>
                        Use the value and onValueChange props to control the
                        accordion. The value is always an array of open item
                        values.
                      </AccordionPanel>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                      <AccordionTrigger>
                        Why use controlled state?
                      </AccordionTrigger>
                      <AccordionPanel>
                        Controlled state gives you full control over the
                        accordion, allowing you to sync it with other parts of
                        your UI or save the state to localStorage.
                      </AccordionPanel>
                    </AccordionItem>
                  </Accordion>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setAccordionValue(['item-1', 'item-2', 'item-3'])
                      }
                    >
                      Open All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAccordionValue([])}
                    >
                      Close All
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-20" />
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}
